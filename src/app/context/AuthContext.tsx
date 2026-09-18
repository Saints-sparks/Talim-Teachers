"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/CustomToast";
import { apiClient } from "@/lib/apiClient";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import {
  ACCESS_TOKEN_KEY,
  KEEP_SIGNED_IN_KEY,
  USER_KEY,
  extractSchoolId,
  persistAccessToken,
  sessionStore,
  type SessionUser,
} from "@/lib/session";
import { authService } from "@/app/services/auth.service";
import { resolvePostLoginRoute } from "@/app/lib/postLoginRoute";
import { unsubscribeWebPushOnLogout } from "@/app/hooks/usePushNotifications";
import type { AuthResponse, LoginCredentials, User } from "@/types/auth";

/**
 * Roles allowed into the Teachers portal. A sub-admin promoted from a teacher
 * keeps teacher access, so both roles are admitted here.
 */
const TEACHER_PORTAL_ROLES = ["teacher", "school_sub_admin"] as const;
type TeacherPortalRole = (typeof TEACHER_PORTAL_ROLES)[number];

/** Everything the app knows about the current session. */
export interface AuthContextType {
  /** The introspected teacher, or `null` when signed out. */
  user: User | null;
  /** The teacher's school id — the one source of school context for React code. */
  schoolId: string | null;
  /** The bearer token currently in use. */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True while a sign-in or sign-out is in flight — what buttons disable on. */
  isLoading: boolean;
  /** True until the stored session has been restored (or found to be gone). */
  isRestoringSession: boolean;
  /** Signs in, admits only teacher-portal roles, and routes onwards. */
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  /** Clears the session everywhere and returns to sign-in. */
  logout: () => Promise<void>;
  /** Obtains a fresh access token from the refresh cookie. */
  refreshToken: () => Promise<boolean>;
  /** Replaces the token after it was rotated elsewhere. */
  setAccessToken: (token: string | null) => void;
  /** Merges fields into the signed-in user (profile edits). */
  updateUser: (updates: Partial<User>) => void;
  /** Replaces the password (including a temporary one) and adopts the new session. */
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  /**
   * The signed-in user.
   *
   * @deprecated Read `user`; this exists for call sites written against the old hook.
   */
  getUser: () => User | null;
  /**
   * The current access token.
   *
   * @deprecated Read `accessToken`, or `sessionStore.getToken()` outside React.
   */
  getAccessToken: () => string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The one auth hook. Owns the token, the user and the school id.
 *
 * @returns The current session and the actions that change it.
 * @throws When used outside `AuthProvider`.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

/**
 * Reads the persisted token from whichever storage this session used.
 *
 * @returns The stored token, or `null`.
 */
function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Writes the user into the storage this session uses.
 *
 * @param user - The user to persist, or `null` to forget it.
 */
function persistUser(user: User | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      return;
    }
    const keepSignedIn = localStorage.getItem(KEEP_SIGNED_IN_KEY) !== "false";
    const store = keepSignedIn ? localStorage : sessionStorage;
    const other = keepSignedIn ? sessionStorage : localStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
    other.removeItem(USER_KEY);
  } catch {
    /* storage can be unavailable; the in-memory session still works */
  }
}

/**
 * Provides the session to the whole app. Mount once, above everything that
 * reads auth (see `src/app/layout.tsx`).
 *
 * @param props - Standard children.
 * @param props.children - The app tree.
 * @returns The provider element.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  // One source of truth: mirror every session change into the store that
  // services, the API client and the socket read from.
  useEffect(() => {
    sessionStore.set(user as SessionUser | null, accessToken);
  }, [user, accessToken]);

  const clearSession = useCallback(
    (redirectToSignIn = false) => {
      setAccessTokenState(null);
      setUser(null);
      apiClient.setAccessToken(null);
      persistAccessToken(null);
      persistUser(null);
      sessionStore.clear();
      if (redirectToSignIn && typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    },
    [],
  );

  const adoptToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    apiClient.setAccessToken(token);
    persistAccessToken(token);
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const { access_token } = await authService.refresh();
        if (!access_token) throw new Error("No access token returned from refresh");
        adoptToken(access_token);
        return true;
      } catch (error) {
        logger.debug("auth", "token refresh failed", error);
        clearSession(true);
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [adoptToken, clearSession]);

  // The API client refreshes through the context, so there is one refresh in flight.
  useEffect(() => {
    apiClient.initialize(accessToken, refreshToken);
  }, [accessToken, refreshToken]);

  const setAccessToken = useCallback(
    (token: string | null) => {
      if (token) adoptToken(token);
      else clearSession();
    },
    [adoptToken, clearSession],
  );

  /**
   * Loads the user behind a token and stores it, refusing roles this portal
   * does not serve.
   */
  const introspect = useCallback(async (token: string): Promise<User> => {
    const result = await authService.introspect(token);
    if (!result.active || !result.user) throw new Error("Token is invalid");
    const introspected = result.user;
    if (!TEACHER_PORTAL_ROLES.includes(introspected.role as TeacherPortalRole)) {
      const friendlyRole = introspected.role.replace(/_/g, " ");
      throw new Error(
        `Access denied. This portal is for teachers only. ` +
          `Your account is registered as "${friendlyRole}". ` +
          `Please use the correct Talim app for your role.`,
      );
    }
    setUser(introspected);
    persistUser(introspected);
    return introspected;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      let response: AuthResponse;
      setIsLoading(true);
      try {
        response = await authService.login(credentials);
      } catch (error) {
        setIsLoading(false);
        const message =
          error instanceof ApiError && (error.status === 401 || error.code === "UNAUTHENTICATED")
            ? "Incorrect email or password. Please check your credentials and try again."
            : getErrorMessage(error, "Login failed");
        toast.error(message);
        throw new Error(message);
      }

      // Introspect before storing anything, so a wrong-role account never gets
      // a session in this portal.
      let userData: User;
      try {
        adoptToken(response.access_token);
        userData = await introspect(response.access_token);
      } catch (error) {
        clearSession();
        setIsLoading(false);
        const message = getErrorMessage(error, "Could not verify your account. Please try again.");
        toast.error(message);
        throw new Error(message);
      }

      window.dispatchEvent(new CustomEvent("auth-changed", { detail: { type: "login", user: userData } }));

      if (userData.mustChangePassword) toast.info("Set a new password to finish signing in.");
      else toast.success("Login successful!");

      router.replace(resolvePostLoginRoute(userData));
      setIsLoading(false);
      return response;
    },
    [adoptToken, clearSession, introspect, router],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    // Stop this browser's push notifications while the token still works, but
    // never hold up signing out for long.
    await Promise.race([
      unsubscribeWebPushOnLogout(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    try {
      await authService.logout();
    } catch (error) {
      // The local session is cleared regardless; a failed server logout only
      // means the refresh token expires on its own.
      logger.debug("auth", "server logout failed", error);
    }

    clearSession();
    setIsLoading(false);
    window.dispatchEvent(new CustomEvent("auth-changed", { detail: { type: "logout" } }));
    router.push("/");
  }, [clearSession, router]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const { access_token } = await authService.changePassword(currentPassword, newPassword, confirmPassword);
      if (access_token) {
        setAccessTokenState(access_token);
        await introspect(access_token).catch(() => undefined);
      }
    },
    [introspect],
  );

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((previous) => {
      if (!previous) return previous;
      const next = { ...previous, ...updates };
      persistUser(next);
      return next;
    });
  }, []);

  // A failed refresh anywhere (including inside the API client) ends the session.
  useEffect(() => {
    const handleAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "logout") clearSession(true);
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, [clearSession]);

  // Restore the stored session on load.
  useEffect(() => {
    let cancelled = false;
    const initialise = async () => {
      try {
        const storedToken = readStoredToken();
        if (storedToken) {
          setAccessTokenState(storedToken);
          apiClient.setAccessToken(storedToken);
          try {
            await introspect(storedToken);
          } catch {
            await refreshToken();
          }
        } else {
          await refreshToken();
        }
      } catch (error) {
        logger.debug("auth", "session restore failed", error);
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    };
    initialise();
    return () => {
      cancelled = true;
    };
    // Runs once: `introspect` and `refreshToken` are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUser = useCallback(() => sessionStore.getUser() as User | null, []);
  const getAccessToken = useCallback(() => sessionStore.getToken(), []);

  const value: AuthContextType = {
    user,
    schoolId: extractSchoolId(user?.schoolId),
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    isRestoringSession,
    login,
    logout,
    refreshToken,
    setAccessToken,
    updateUser,
    changePassword,
    getUser,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
