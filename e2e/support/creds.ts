/**
 * The accounts created by the backend's `e2e/seed.js`. Fixed on purpose: the
 * seed prints the same list, and the README documents it.
 */
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:5055";
export const ENVELOPE = process.env.E2E_ENVELOPE ?? "false";

export interface Account {
  email: string;
  password: string;
  name: string;
}

const PASSWORD = "Demo#Pass2026";

export const ACCOUNTS = {
  schoolAdmin: { email: "admin@e2e.talim.test", password: PASSWORD, name: "Sade Principal" },
  subAdmin: { email: "subadmin@e2e.talim.test", password: PASSWORD, name: "Sam Subadmin" },
  /** Class teacher of Grade 5A (two students, published grades). */
  teacher: { email: "teacher@e2e.talim.test", password: PASSWORD, name: "Tolu Teacher" },
  /** On a temporary password: `seed.js --rearm` puts it back after a test changes it. */
  tempTeacher: { email: "temp.teacher@e2e.talim.test", password: "Temp#Pass2026x", name: "Temi Temporary" },
  student: { email: "ada.student@e2e.talim.test", password: PASSWORD, name: "Ada Student" },
  parent: { email: "parent@e2e.talim.test", password: PASSWORD, name: "Paul Parent" },
} satisfies Record<string, Account>;

export const AUTH_DIR = "e2e/.auth";
export const authFile = (key: keyof typeof ACCOUNTS): string => `${AUTH_DIR}/${key}.json`;
