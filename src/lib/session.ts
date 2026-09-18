/**
 * In-memory session store — the one place non-React code (services, the API
 * client, the socket) reads the signed-in teacher and their school from.
 *
 * `AuthContext` writes to it whenever the session changes; everything else
 * only reads. On a cold call before `AuthContext` has mounted it hydrates
 * once from the persisted user, so early service calls still resolve.
 * Nothing here decodes tokens: the introspected user is the source of truth.
 *
 * This replaces the old split where the access token lived in a cookie, the
 * user lived in `localStorage`, and the two were kept in step by a
 * `user-updated` window event.
 */

/** Storage key for the access token. */
export const ACCESS_TOKEN_KEY = "accessToken";
/** Storage key for the introspected user. */
export const USER_KEY = "user";
/** Storage key for the "keep me signed in" preference. */
export const KEEP_SIGNED_IN_KEY = "keepSignedIn";

/**
 * Persists the access token in whichever storage this session uses and
 * publishes it to `sessionStore`, so a token rotated outside `AuthContext`
 * (a password change, for instance) is picked up everywhere at once.
 *
 * @param token - The new access token, or `null` to forget it.
 */
export function persistAccessToken(token: string | null): void {
  sessionStore.setToken(token);
  if (typeof window === "undefined") return;
  try {
    if (!token) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    const keepSignedIn = localStorage.getItem(KEEP_SIGNED_IN_KEY) !== "false";
    if (keepSignedIn) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    /* storage can be unavailable (private mode); the in-memory token still works */
  }
}

/** The signed-in teacher, as stored for non-React code to read. */
export interface SessionUser {
  _id?: string;
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  schoolId?: string | { _id?: string; id?: string; name?: string };
  schoolName?: string;
  userAvatar?: string;
  mustChangePassword?: boolean;
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

type Listener = () => void;

let currentUser: SessionUser | null = null;
let currentToken: string | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * Reads a persisted value from whichever storage holds this session.
 *
 * @param key - Storage key.
 * @returns The stored string, or `null`.
 */
function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Loads the persisted user/token once, for reads that happen before AuthContext mounts. */
function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  currentToken = readStorage(ACCESS_TOKEN_KEY);
  const raw = readStorage(USER_KEY);
  if (raw) {
    try {
      currentUser = JSON.parse(raw) as SessionUser;
    } catch {
      currentUser = null;
    }
  }
}

/** Tells every subscriber the session changed. */
function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Extracts a 24-hex school id from the shapes the API returns for
 * `user.schoolId` (a string, or a populated `{ _id }` object).
 *
 * @param value - The raw `schoolId` field.
 * @returns The id, or `null` when there is none.
 */
export function extractSchoolId(value: unknown): string | null {
  if (typeof value === "string") return OBJECT_ID.test(value) ? value : null;
  if (value && typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    if (typeof obj._id === "string" && OBJECT_ID.test(obj._id)) return obj._id;
    if (typeof obj.id === "string" && OBJECT_ID.test(obj.id)) return obj.id;
  }
  return null;
}

export const sessionStore = {
  /**
   * The signed-in teacher.
   *
   * @returns The user, or `null` when signed out.
   */
  getUser(): SessionUser | null {
    hydrate();
    return currentUser;
  },

  /**
   * The current access token.
   *
   * @returns The token, or `null` when signed out.
   */
  getToken(): string | null {
    hydrate();
    return currentToken;
  },

  /**
   * The signed-in teacher's school id.
   *
   * @returns The school id, or `null` when signed out.
   */
  getSchoolId(): string | null {
    hydrate();
    return extractSchoolId(currentUser?.schoolId);
  },

  /**
   * The signed-in teacher's user id.
   *
   * @returns The user id, or `null` when signed out.
   */
  getUserId(): string | null {
    hydrate();
    return currentUser?.userId ?? currentUser?._id ?? null;
  },

  /**
   * Replaces the user (and optionally the token). Called by AuthContext.
   *
   * @param user - The new user, or `null`.
   * @param token - The new access token, when it changed too.
   */
  set(user: SessionUser | null, token?: string | null): void {
    hydrated = true;
    currentUser = user;
    if (token !== undefined) currentToken = token;
    notify();
  },

  /**
   * Updates the token only (after a refresh).
   *
   * @param token - The new access token, or `null`.
   */
  setToken(token: string | null): void {
    hydrated = true;
    currentToken = token;
    notify();
  },

  /**
   * Merges fields into the current user (profile edits).
   *
   * @param partial - Fields to overwrite.
   */
  patchUser(partial: Partial<SessionUser>): void {
    if (!currentUser) return;
    currentUser = { ...currentUser, ...partial };
    notify();
  },

  /** Clears everything on logout. */
  clear(): void {
    hydrated = true;
    currentUser = null;
    currentToken = null;
    notify();
  },

  /**
   * Subscribes to session changes.
   *
   * @param listener - Called after every change.
   * @returns An unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Test seam: forgets the hydrated-from-storage flag. */
  _resetForTests(): void {
    hydrated = false;
    currentUser = null;
    currentToken = null;
  },
};
