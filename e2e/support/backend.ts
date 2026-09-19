import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * The backend checkout that holds e2e/seed.js. Defaults to the throwaway
 * worktree next to the app checkouts; override with E2E_BACKEND_DIR.
 */
const BACKEND_DIR = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../../talimBE-V2-e2e");

/**
 * Runs the seed script's `--rearm` (temporary-password teacher back on its
 * temporary password) or `--reset` (that, plus the records the suites create).
 */
export function seed(flag: "--rearm" | "--reset"): void {
  execFileSync("node", [path.join(BACKEND_DIR, "e2e/seed.js"), flag], { cwd: BACKEND_DIR, stdio: "pipe" });
}
