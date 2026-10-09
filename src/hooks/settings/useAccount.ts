"use client";

/**
 * React Query hooks over Round 4's account endpoints (`accountService`,
 * §33–36): the profile save, signed-in sessions, the password policy and the
 * school office's contact details, and the v1.5 delete-account request.
 * Keys come from `queryKeys.settings`.
 * Support tickets moved to `src/hooks/support/useTickets.ts` (v1.5).
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { accountService } from "@/app/services/account/account.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import type {
  AccountDeletionBody,
  AccountDeletionScheduled,
  AuthSession,
  PasswordPolicy,
  RevokeOthersResult,
  SchoolContact,
} from "@/types/inboxSettings";
import { deletionScheduledRoute, type ProfileField } from "./settings.logic";

/** The password policy changes with a deploy at most: keep it for the session. */
const POLICY_STALE_MS = 60 * 60_000;

/**
 * The signed-in user's id, for the query keys.
 *
 * @returns The id, or an empty string when signed out.
 */
function useUserId(): string {
  const { user } = useAuth();
  return user?.userId ?? "";
}

/**
 * Saves one profile field (`PATCH /teacher/settings/profile` with only that
 * field). On success the signed-in user is updated, so the header and every
 * other place that shows the name or phone change at once, and the settings
 * query is invalidated.
 *
 * @returns `save(field, value)`, which resolves when saved and throws the `ApiError` otherwise.
 */
export function useSaveProfileField(): (field: ProfileField, value: string) => Promise<void> {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const userId = useUserId();
  const { mutateAsync } = useMutation({
    mutationFn: ({ field, value }: { field: ProfileField; value: string }) => accountService.updateProfile({ [field]: value }),
    onSuccess: (_data, { field, value }) => {
      updateUser({ [field]: value });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.teacher(userId) });
    },
  });
  return useCallback(
    async (field: ProfileField, value: string) => {
      await mutateAsync({ field, value });
    },
    [mutateAsync],
  );
}

/**
 * The teacher's signed-in devices (`GET /auth/sessions`).
 *
 * @returns The query result; idle until there is a signed-in user.
 */
export function useSessions(): UseQueryResult<AuthSession[], unknown> {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.settings.sessions(userId),
    queryFn: () => accountService.listSessions(),
    enabled: Boolean(userId),
    staleTime: staleTimes.live,
  });
}

/**
 * Signs one device out (`DELETE /auth/sessions/:id`), then reloads the list.
 *
 * @returns The mutation; `mutate` takes the session id.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (id: string) => accountService.revokeSession(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions(userId) }),
  });
}

/**
 * Signs out every device but this one (`POST /auth/sessions/revoke-others`),
 * then reloads the list.
 *
 * @returns The mutation; it resolves with `{ revoked }`.
 */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation<RevokeOthersResult, unknown, void>({
    mutationFn: () => accountService.revokeOtherSessions(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions(userId) }),
  });
}

/**
 * The rules a new password must meet (`GET /auth/password-policy`, public).
 *
 * @returns The query result.
 */
export function usePasswordPolicy(): UseQueryResult<PasswordPolicy, unknown> {
  return useQuery({
    queryKey: queryKeys.settings.passwordPolicy(),
    queryFn: () => accountService.getPasswordPolicy(),
    staleTime: POLICY_STALE_MS,
  });
}

/**
 * The school office's phone, email, address and hours
 * (`GET /teachers/me/school`); shared by the Messages tab and the contact sheet.
 *
 * @param enabled - False to hold the request (the contact sheet loads it when opened).
 * @returns The query result.
 */
export function useSchoolContact(enabled = true): UseQueryResult<SchoolContact, unknown> {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.settings.schoolContact(userId),
    queryFn: () => accountService.getSchoolContact(),
    enabled: Boolean(userId) && enabled,
    staleTime: staleTimes.reference,
  });
}

/**
 * Invalidates the sessions list (after a password change signs other devices out).
 *
 * @returns A function that marks the list stale.
 */
export function useInvalidateSessions(): () => void {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions(userId) });
  }, [queryClient, userId]);
}

/**
 * Asks for the account to be deleted (`POST /auth/account/deletion`). On
 * success the server has already ended every session, so this signs out here
 * through `AuthContext.logout` (tokens, stored user, query cache; no further
 * server calls, `sessionEnded`) and lands
 * on sign-in with the scheduled date (`deletionScheduledRoute`). The mutation
 * stays pending until the sign-out has run.
 *
 * @returns The mutation; `mutate` takes `{ password, reason? }` and throws the `ApiError` on refusal.
 */
export function useRequestAccountDeletion() {
  const { logout } = useAuth();
  return useMutation<AccountDeletionScheduled, unknown, AccountDeletionBody>({
    mutationFn: (body) => accountService.requestDeletion(body),
    onSuccess: async ({ scheduledFor }) => {
      await logout({ redirectTo: deletionScheduledRoute(scheduledFor), sessionEnded: true });
    },
  });
}
