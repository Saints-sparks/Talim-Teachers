#!/usr/bin/env node
/**
 * Refreshes src/types/api.d.ts from a backend checkout's generated contract
 * (docs/api-types.d.ts). Offline: it only copies a file.
 *
 *   npm run types:api
 *   TALIM_BACKEND_PATH=/path/to/talimBE-V2 npm run types:api
 *
 * Exits 0 (with a message) when the backend checkout is not present, so a
 * missing checkout never breaks CI or a fresh clone.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies `source` to `target`, reporting whether the target changed.
 * @returns {"missing-source" | "created" | "updated" | "unchanged"}
 */
export function syncApiTypes(source, target) {
  if (!existsSync(source)) return "missing-source";
  const next = readFileSync(source);
  const exists = existsSync(target);
  if (exists && readFileSync(target).equals(next)) return "unchanged";
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, next);
  return exists ? "updated" : "created";
}

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_TARGET = resolve(appRoot, "src/types/api.d.ts");

/** CLI entry: resolves the backend path from the environment and prints the outcome. */
function main() {
  const backend = resolve(appRoot, process.env.TALIM_BACKEND_PATH ?? "../talimBE-V2");
  const source = resolve(backend, "docs/api-types.d.ts");
  const result = syncApiTypes(source, DEFAULT_TARGET);
  if (result === "missing-source") {
    console.log(`api types: backend contract not found at ${source}; kept the existing copy (set TALIM_BACKEND_PATH to refresh).`);
  } else if (result === "unchanged") {
    console.log("api types: already up to date (no change).");
  } else {
    console.log(`api types: ${result} ${DEFAULT_TARGET} from ${source}. Run npm run type-check to see what the new contract breaks.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
