#!/usr/bin/env node
/**
 * Verify the npm tarball contains every file that package.json points at, and that the
 * published bundle stays importable from a browser.
 *
 *   node scripts/check-pack.ts
 *
 * Run after `npm run build`. Fails when `main`, `module`, `types` or an
 * `exports` target is missing from `npm pack --dry-run`, which catches
 * `.npmignore` rules that strip build output, or when the bundle imports a Node
 * builtin that a browser bundler cannot resolve.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isBuiltin as isBuiltinModule } from "node:module";
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

// Browser bundlers can't resolve Node builtins, so the published bundle must not import
// any. `node:fs`/`node:path` are exempt: they are loaded lazily inside the default file
// writer, which only runs under Node.
const BROWSER_SAFE_BUILTINS = new Set(["node:fs", "node:path"]);
const IMPORT_RE =
  /\bfrom\s*["'](?<staticSpecifier>[^"']+)["']|\bimport\(\s*["'](?<dynamicSpecifier>[^"']+)["']/gu;

const bundle = readFileSync(join(ROOT, pkg.module), "utf8");
const builtins = new Set<string>();
for (const match of bundle.matchAll(IMPORT_RE)) {
  const specifier =
    match.groups?.staticSpecifier ?? match.groups?.dynamicSpecifier;
  const isBuiltin =
    specifier !== undefined &&
    (specifier.startsWith("node:") || isBuiltinModule(specifier.split("/")[0]));
  if (isBuiltin && !BROWSER_SAFE_BUILTINS.has(specifier)) {
    builtins.add(specifier);
  }
}

if (builtins.size > 0) {
  console.error(
    `${pkg.module} imports Node builtins, which breaks browser consumers:\n  ${[
      ...builtins,
    ].join("\n  ")}`,
  );
  process.exit(1);
}
console.log(`${pkg.module} imports no browser-unsafe Node builtins.`);
