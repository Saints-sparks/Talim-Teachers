/**
 * Dev and test fixtures for Round 4's Settings (`PATCH /teacher/settings/profile`,
 * `GET /auth/sessions`, `DELETE /auth/sessions/:id`,
 * `POST /auth/sessions/revoke-others`, `GET /auth/password-policy`,
 * and `GET /teachers/me/school`), in the shapes of
 * `src/types/inboxSettings.ts`.
 *
 * The school and its office are the design's (Easy Sparks Education Center,
 * 08:00 to 16:00). Revoking sessions writes to an in-memory store until the
 * page is reloaded. Nothing in a production build imports this file
 * statically.
 */
import { FIXTURE_SCHOOL } from "@/lib/fixtures/classroom.fixture";
import type { AuthSession, PasswordPolicy, RevokeOthersResult, SchoolContact } from "@/types/inboxSettings";

/**
 * `GET /teachers/me/school`.
 *
 * @returns The design's school office.
 */
export function makeSchoolContactFixture(): SchoolContact {
  return {
    name: FIXTURE_SCHOOL,
    phone: "+234 802 415 7730",
    email: "office@easysparks.edu.ng",
    address: "14 Oduduwa Crescent, GRA Ikeja, Lagos",
    officeHours: { start: "08:00", end: "16:00" },
  };
}

/**
 * `GET /auth/password-policy`: the backend's defaults.
 *
 * @returns The policy.
 */
export function makePasswordPolicyFixture(): PasswordPolicy {
  return { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSymbol: true, historyCount: 5 };
}

/** Three sessions: this browser, the phone app and an old laptop. */
function seedSessions(): AuthSession[] {
  return [
    {
      id: "sess-this",
      device: "Desktop",
      browser: "Chrome 129",
      os: "Windows 11",
      ip: "102.89.34.12",
      lastUsedAt: "2026-09-25T09:20:00.000Z",
      createdAt: "2026-09-21T07:30:00.000Z",
      current: true,
    },
    {
      id: "sess-phone",
      device: "iPhone",
      browser: "Talim app",
      os: "iOS 18",
      ip: "105.112.7.40",
      lastUsedAt: "2026-09-24T19:02:00.000Z",
      createdAt: "2026-09-02T18:11:00.000Z",
      current: false,
    },
    {
      id: "sess-laptop",
      device: null,
      browser: "Safari 17",
      os: "macOS",
      ip: null,
      lastUsedAt: "2026-09-12T15:45:00.000Z",
      createdAt: "2026-09-12T15:40:00.000Z",
      current: false,
    },
  ];
}

let sessions = seedSessions();

/** Restores the sessions seed (tests call this in `beforeEach`). */
export function resetSettingsFixtureStore(): void {
  sessions = seedSessions();
}

/**
 * `GET /auth/sessions`.
 *
 * @returns The active sessions.
 */
export function listSessionsFixture(): AuthSession[] {
  return sessions.map((session) => ({ ...session }));
}

/**
 * `DELETE /auth/sessions/:id`.
 *
 * @param id - The session.
 */
export function revokeSessionFixture(id: string): void {
  sessions = sessions.filter((session) => session.id !== id);
}

/**
 * `POST /auth/sessions/revoke-others`.
 *
 * @returns How many were revoked.
 */
export function revokeOtherSessionsFixture(): RevokeOthersResult {
  const before = sessions.length;
  sessions = sessions.filter((session) => session.current);
  return { revoked: before - sessions.length };
}

