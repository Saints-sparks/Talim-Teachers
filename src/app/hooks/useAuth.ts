"use client";

/**
 * Compatibility shim. The session used to live here, split between cookies
 * (token) and `localStorage` (user) and kept in step by a `user-updated`
 * window event. It now lives in one place — `AuthContext` — and this module
 * only re-exports it so existing call sites keep working.
 *
 * New code should import `useAuth` from `@/app/context/AuthContext`, and
 * `useSchoolId` from `@/hooks/useSchoolId`.
 */
export { useAuth, AuthContext, AuthProvider } from "@/app/context/AuthContext";
export type { AuthContextType as UseAuthReturn } from "@/app/context/AuthContext";
