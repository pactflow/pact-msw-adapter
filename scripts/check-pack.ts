#!/usr/bin/env node
/**
 * Verify the npm tarball contains every file that package.json points at.
 *
 *   node scripts/check-pack.ts
 *
 * Run after `npm run build`. Fails when `main`, `module`, `types` or an
 * `exports` target is missing from `npm pack --dry-run`, which catches
 * `.npmignore` rules that strip build output.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

function targets(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(targets);
  }
  return [];
}

const expected = new Set(
  [pkg.main, pkg.module, pkg.types, ...targets(pkg.exports)]
    .filter((p): p is string => typeof p === "string")
    .map((p) => normalize(p)),
);

const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  }),
);
const packed = new Set(
  pack.files.map((f: { path: string }) => normalize(f.path)),
);

const missing = [...expected].filter((p) => !packed.has(p));
if (missing.length > 0) {
  console.error(`Missing from the npm tarball:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`npm tarball contains all ${expected.size} entry points.`);
