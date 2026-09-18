import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/app/context/AuthContext";
import type { User } from "@/types/auth";

// ─── Mock user presets ────────────────────────────────────────────────────────

/** A plain teacher with one school. */
export const mockTeacher = {
  _id: "68c0a1b2c3d4e5f600000001",
  userId: "68c0a1b2c3d4e5f600000001",
  email: "teacher@talim.test",
  role: "teacher",
  firstName: "Ada",
  lastName: "Bello",
  phoneNumber: "08000000000",
  isActive: true,
  isEmailVerified: true,
  schoolId: "68c0a1b2c3d4e5f6000000aa",
  schoolName: "Talim Test School",
} as User;

/** A teacher who was promoted to sub-admin — still admitted to this portal. */
export const mockSubAdmin = { ...mockTeacher, userId: "68c0a1b2c3d4e5f600000002", role: "school_sub_admin" } as User;

/** A teacher who must replace a temporary password before doing anything else. */
export const mockTeacherMustChangePassword = { ...mockTeacher, mustChangePassword: true } as User;

// ─── Mock auth context value ──────────────────────────────────────────────────

/**
 * Builds an `AuthContext` value for a signed-in user, with every action stubbed.
 *
 * @param user - The signed-in user, or `null` for a signed-out tree.
 * @returns A context value tests can assert against.
 */
export function makeMockAuthValue(user: User | null = mockTeacher): AuthContextType {
  return {
    user,
    schoolId: typeof user?.schoolId === "string" ? user.schoolId : (user?.schoolId?._id ?? null),
    accessToken: user ? "mock-token" : null,
    isAuthenticated: !!user,
    isLoading: false,
    isRestoringSession: false,
    login: jest.fn().mockResolvedValue({ access_token: "mock-token" }),
    logout: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(true),
    setAccessToken: jest.fn(),
    updateUser: jest.fn(),
    changePassword: jest.fn().mockResolvedValue(undefined),
    getUser: () => user,
    getAccessToken: () => (user ? "mock-token" : null),
  };
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

/** Options `renderWithProviders` accepts on top of Testing Library's. */
export interface ProviderOptions extends RenderOptions {
  /** Who is signed in; `null` renders a signed-out tree. */
  user?: User | null;
  /** Override the whole auth value (for testing a half-loaded session). */
  auth?: Partial<AuthContextType>;
}

/**
 * Wraps a tree in the providers every page depends on: a throwaway
 * QueryClient and a stubbed auth context.
 *
 * @param props - Children plus the session to render them under.
 * @param props.children - The tree under test.
 * @param props.user - Who is signed in.
 * @param props.auth - Overrides merged into the auth value.
 * @returns The wrapped tree.
 */
export function AllProviders({
  children,
  user = mockTeacher,
  auth,
}: {
  children: React.ReactNode;
  user?: User | null;
  auth?: Partial<AuthContextType>;
}) {
  // A fresh QueryClient per render: no cache leaks between tests, and
  // failures surface immediately instead of being retried.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{ ...makeMockAuthValue(user), ...auth }}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * `render` with the app's providers already in place. Import this instead of
 * Testing Library's `render`.
 *
 * @param ui - The element under test.
 * @param options - Testing Library options plus `user` / `auth`.
 * @returns The Testing Library render result.
 */
function renderWithProviders(ui: React.ReactElement, options?: ProviderOptions) {
  const { user, auth, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders user={user} auth={auth}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

export * from "@testing-library/react";
export { renderWithProviders, renderWithProviders as render };
