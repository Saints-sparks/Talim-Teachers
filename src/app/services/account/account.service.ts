/**
 * Round 4's account endpoints for the redesigned Settings (§33–36 of
 * `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`):
 *
 * - `PATCH /teacher/settings/profile` (name and phone; email is read-only)
 * - `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-others`
 * - `GET /auth/password-policy` (public)
 * - `POST /support/tickets`
 * - `GET /teachers/me/school`
 *
 * Every call goes through the typed client, which unwraps the success
 * envelope and throws `ApiError`. With `NEXT_PUBLIC_USE_FIXTURES=true` in a
 * dev build the calls answer from `src/lib/fixtures/settings.fixture.ts`.
 */
import { api } from "@/lib/apiClient";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { TeacherSettings } from "@/hooks/settings/useTeacherSettings";
import type {
  AuthSession,
  PasswordPolicy,
  RevokeOthersResult,
  SchoolContact,
  SupportTicketBody,
  SupportTicketResult,
  UpdateProfileBody,
} from "@/types/inboxSettings";

export const accountService = {
  /**
   * `PATCH /teacher/settings/profile`: first name, last name, phone or avatar.
   *
   * @param body - Only the fields that changed.
   * @returns The settings after the save (the `GET /teacher/settings` shape).
   * @throws ApiError: 400 with field errors for a name or phone the server refuses.
   */
  updateProfile: async (body: UpdateProfileBody): Promise<TeacherSettings> => {
    if (fixturesEnabled()) return { profile: { ...body } };
    return api.patch<TeacherSettings>("/teacher/settings/profile", body);
  },

  /**
   * `GET /auth/sessions`: the caller's signed-in devices. `current` marks this
   * browser (all false when the server can't tell).
   *
   * @returns The sessions.
   * @throws ApiError when the request fails.
   */
  listSessions: async (): Promise<AuthSession[]> => {
    if (fixturesEnabled()) {
      const { listSessionsFixture } = await import("@/lib/fixtures/settings.fixture");
      return listSessionsFixture();
    }
    const sessions = await api.get<AuthSession[]>("/auth/sessions");
    return Array.isArray(sessions) ? sessions : [];
  },

  /**
   * `DELETE /auth/sessions/:id`: signs one of the caller's devices out.
   *
   * @param id - The session.
   * @throws ApiError when it is not the caller's session (404).
   */
  revokeSession: async (id: string): Promise<void> => {
    if (fixturesEnabled()) {
      const { revokeSessionFixture } = await import("@/lib/fixtures/settings.fixture");
      revokeSessionFixture(id);
      return;
    }
    await api.delete(`/auth/sessions/${encodeURIComponent(id)}`);
  },

  /**
   * `POST /auth/sessions/revoke-others`: signs out every device but this one.
   *
   * @returns `{ revoked }`.
   * @throws ApiError when the request fails.
   */
  revokeOtherSessions: async (): Promise<RevokeOthersResult> => {
    if (fixturesEnabled()) {
      const { revokeOtherSessionsFixture } = await import("@/lib/fixtures/settings.fixture");
      return revokeOtherSessionsFixture();
    }
    const body = await api.post<Partial<RevokeOthersResult> | null>("/auth/sessions/revoke-others");
    return { revoked: Number(body?.revoked) || 0 };
  },

  /**
   * `GET /auth/password-policy` (public): the rules a new password must meet.
   *
   * @returns The policy.
   * @throws ApiError when the request fails.
   */
  getPasswordPolicy: async (): Promise<PasswordPolicy> => {
    if (fixturesEnabled()) {
      const { makePasswordPolicyFixture } = await import("@/lib/fixtures/settings.fixture");
      return makePasswordPolicyFixture();
    }
    return api.get<PasswordPolicy>("/auth/password-policy", { skipAuth: true });
  },

  /**
   * `POST /support/tickets`: a problem report for the Talim support team (the
   * school never sees it).
   *
   * @param body - Area, description (10–2000 characters) and context.
   * @returns The reference to quote, e.g. `TS-51234`.
   * @throws ApiError: 400 for a description outside the limits.
   */
  createSupportTicket: async (body: SupportTicketBody): Promise<SupportTicketResult> => {
    if (fixturesEnabled()) {
      const { createSupportTicketFixture } = await import("@/lib/fixtures/settings.fixture");
      return createSupportTicketFixture(body);
    }
    return api.post<SupportTicketResult>("/support/tickets", body);
  },

  /**
   * `GET /teachers/me/school`: the school office's phone, email, address and
   * office hours.
   *
   * @returns The contact details.
   * @throws ApiError when the request fails.
   */
  getSchoolContact: async (): Promise<SchoolContact> => {
    if (fixturesEnabled()) {
      const { makeSchoolContactFixture } = await import("@/lib/fixtures/settings.fixture");
      return makeSchoolContactFixture();
    }
    return api.get<SchoolContact>("/teachers/me/school");
  },
};
