#!/usr/bin/env node
// Checks that repo paths named in living Markdown files exist, with exact letter case.
// Scope: tracked and untracked (non-ignored) *.md files, except docs/reports/, docs/archive/ and the
// append-only logs. Frozen evidence keeps the paths it had on its date, so it is not re-checked.
// Two kinds of reference are checked:
//   1. Markdown link targets: [text](path)            — resolved from the file's folder
//   2. Inline code paths:      `docs/reference/x.md`  — resolved from the repo root, or the file's folder
// Deliberate old paths (redirect tables, evidence) are exempt with HTML comments:
//   <!-- link-check:ignore -->  on one line;  <!-- link-check:off -->  …  <!-- link-check:on -->  for a block.
// Usage: node scripts/docs/check-links.mjs [--all]
//   --all  also scan docs/reports/, docs/archive/ and the append-only logs
// Exit code 1 when any reference is broken.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const includeFrozen = process.argv.includes("--all");
const FROZEN = ["docs/reports/", "docs/archive/"];
// Append-only logs: old lines cite paths as they were when written. Listed in documentation-standard.md §8.
const APPEND_ONLY = ["docs/ledger/changelog-agent.md", "docs/reference/ui-audit-log.md"];

// Exact-case existence. macOS is case-insensitive, so fs.existsSync("UI-AUDIT-LOG.md") is true after a
// case-only rename; a link that only works on macOS would break on the Linux CI. Compare each segment by name.
function existsExact(rel) {
  let dir = root;
  for (const part of path.normalize(rel).split(path.sep).filter((p) => p && p !== ".")) {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return false;
    }
    if (!names.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

const gitList = (args) =>
  execFileSync("git", ["ls-files", ...args, "*.md"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);

const listed = [...new Set(gitList(["--cached", "--others", "--exclude-standard"]))]
  .filter((file) => existsExact(file)) // drops tracked files that were moved away and not yet committed
  .filter((file) => includeFrozen || (!FROZEN.some((prefix) => file.startsWith(prefix)) && !APPEND_ONLY.includes(file)));

// Inline-code tokens that look like a repo path to a file (has a slash or is a root *.md name).
const CODE_PATH = /^[A-Za-z0-9_.\-/]+\.(md|pdf|json|png|webp|ts|tsx|mjs|cjs|js|sh|py|sql|yml|toml)(:\d+(-\d+)?)?$/;
const MD_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;

const isExternal = (target) =>
  /^(https?:|mailto:|tel:|data:)/.test(target) || target.startsWith("#") || target.startsWith("/");

const broken = [];

for (const file of listed) {
  const folder = path.dirname(file);
  const lines = readFileSync(path.join(root, file), "utf8").split("\n");
  let inFence = false;
  let skipping = false;

  lines.forEach((line, index) => {
    if (line.includes("<!-- link-check:off -->")) {
      skipping = true;
      return;
    }
    if (line.includes("<!-- link-check:on -->")) {
      skipping = false;
      return;
    }
    if (skipping || line.includes("<!-- link-check:ignore -->")) return;
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    for (const match of line.matchAll(MD_LINK)) {
      const target = match[1].split("#")[0].replace(/:\d+(-\d+)?$/, "");
      if (!target || isExternal(target)) continue;
      if (!existsExact(path.normalize(path.join(folder, target)))) {
        broken.push({ file, line: index + 1, kind: "link", target });
      }
    }

    for (const match of line.matchAll(CODE_SPAN)) {
      const token = match[1];
      if (!CODE_PATH.test(token) || token.startsWith("/")) continue;
      // Bare names (no folder) are folder-relative by convention, so they are not checked.
      if (!token.includes("/") && !token.endsWith(".md")) continue;
      const target = token.replace(/:\d+(-\d+)?$/, "");
      if (!existsExact(path.normalize(target)) && !existsExact(path.normalize(path.join(folder, target)))) {
        broken.push({ file, line: index + 1, kind: "code", target: token });
      }
    }
  });
}

if (broken.length === 0) {
  console.log(`docs links OK — ${listed.length} markdown files checked.`);
  process.exit(0);
}

for (const item of broken) {
  console.log(`${item.file}:${item.line}  [${item.kind}] missing → ${item.target}`);
}
console.log(`\n${broken.length} broken reference(s) in ${listed.length} markdown files.`);
process.exit(1);
