#!/usr/bin/env node
/**
 * Release management for @pactflow/pact-msw-adapter.
 *
 *   node scripts/release.ts prepare [--dry-run]
 *   node scripts/release.ts tag     [--dry-run]
 *
 * `prepare` computes the next version from conventional commits via git-cliff,
 * updates package.json + CHANGELOG.md, and force-pushes the fixed release
 * branch with a draft PR. `tag` reads the version from package.json and pushes
 * a `v{version}` tag (idempotent).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG_PATH = join(ROOT, "package.json");
const RELEASE_BRANCH = "release/pact-msw-adapter";

const RE_LEADING_V = /^v/;
const RE_VERSION_FIELD = /^(\s*"version"\s*:\s*")[^"]*(")/m;

// --- Pure helpers ---------------------------------------------------------

/** Strip a leading `v` and return null for empty input. */
export function parseBumpedVersion(cliffStdout: string): string | null {
  const raw = cliffStdout.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(RE_LEADING_V, "");
}

/**
 * Next version to release, or null when there is nothing to do (no bump, or
 * git-cliff returned the already-released version — e.g. only deps commits).
 */
export function nextVersion(
  cliffStdout: string,
  currentVersion: string,
): string | null {
  const version = parseBumpedVersion(cliffStdout);
  if (version === null || version === currentVersion) {
    return null;
  }
  return version;
}

export function tagName(version: string): string {
  return `v${version}`;
}

export function prTitle(version: string): string {
  return `chore(release): v${version}`;
}

/** Replace the `"version"` field, preserving surrounding formatting. */
export function setPackageVersion(pkgJson: string, version: string): string {
  if (!RE_VERSION_FIELD.test(pkgJson)) {
    throw new Error("Could not find version field in package.json");
  }
  return pkgJson.replace(RE_VERSION_FIELD, `$1${version}$2`);
}

// --- Shell wrappers -------------------------------------------------------

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", cwd: ROOT });
}

function gitCliff(args: string[]): string {
  return execFileSync("git", ["cliff", ...args], {
    encoding: "utf8",
    cwd: ROOT,
  });
}

function gh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", cwd: ROOT });
}

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8")) as { version: string };
  return pkg.version;
}

// --- Commands -------------------------------------------------------------

function computeNextVersion(): string | null {
  let out: string;
  try {
    out = gitCliff(["--bumped-version"]);
  } catch {
    return null;
  }
  return nextVersion(out, readPackageVersion());
}

function findOpenReleasePr(): number | null {
  const out = gh([
    "pr",
    "list",
    "--head",
    RELEASE_BRANCH,
    "--state",
    "open",
    "--json",
    "number",
    "--jq",
    "first",
  ]).trim();
  if (!out || out === "null") {
    return null;
  }
  return (JSON.parse(out) as { number: number }).number;
}

function pushReleaseBranch(
  title: string,
  body: string,
  existing: number | null,
): void {
  try {
    git(["checkout", "-B", RELEASE_BRANCH, "origin/main"]);
    git(["add", "package.json", "CHANGELOG.md"]);
    git(["commit", "-m", title]);
    git(["push", "--force", "origin", RELEASE_BRANCH]);
    if (existing === null) {
      gh([
        "pr",
        "create",
        "--title",
        title,
        "--body",
        body,
        "--base",
        "main",
        "--head",
        RELEASE_BRANCH,
        "--draft",
      ]);
    } else {
      gh(["pr", "edit", String(existing), "--title", title, "--body", body]);
    }
  } finally {
    git(["checkout", "main"]);
  }
}

function prepare(dryRun: boolean): void {
  const version = computeNextVersion();
  if (!version) {
    console.log("No version bump needed. Nothing to do.");
    return;
  }
  console.log(`Proposed next version: ${version}`);

  const tagStr = tagName(version);
  const changelog = gitCliff([
    "--tag",
    tagStr,
    "--unreleased",
    "--strip",
    "header",
  ]);

  writeFileSync(
    PKG_PATH,
    setPackageVersion(readFileSync(PKG_PATH, "utf8"), version),
  );
  gitCliff(["--tag", tagStr, "--unreleased", "--prepend", "CHANGELOG.md"]);

  if (dryRun) {
    console.log(`\n--- Changelog for v${version} ---\n${changelog}`);
    console.log("[dry-run] Files written — revert with `git checkout`.");
    return;
  }

  pushReleaseBranch(prTitle(version), changelog, findOpenReleasePr());
  console.log(`Release PR for v${version} created/updated.`);
}

function tag(dryRun: boolean): void {
  const version = readPackageVersion();
  const name = tagName(version);
  git(["fetch", "--tags", "origin"]);
  if (git(["tag", "-l", name]).trim()) {
    console.log(`Tag ${name} already exists. Nothing to do.`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] Would create and push tag ${name}.`);
    return;
  }
  git(["tag", name]);
  git(["push", "origin", name]);
  console.log(`Tag ${name} pushed.`);
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { "dry-run": { type: "boolean", default: false } },
  });
  const [command] = positionals;
  const dryRun = values["dry-run"] === true;

  if (command === "prepare") {
    prepare(dryRun);
  } else if (command === "tag") {
    tag(dryRun);
  } else {
    console.error(
      `Unknown command: ${command ?? "(none)"} (expected prepare|tag)`,
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
