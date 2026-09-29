#!/usr/bin/env node
// Release identity for the built tree (run automatically after `vite build` via the
// package.json postbuild hook). Writes into dist/:
//   BUILD_INFO            single-line JSON: exact release/commit identity, never hand-edited
//   RELEASE_MANIFEST.sha256  sha256 of every build file, `sha256sum -c` verifiable
// release.sh refuses to ship a tree whose BUILD_INFO.release != HEAD, so a stale
// BUILD_INFO (the old "what is live?" ambiguity) is impossible by construction.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const SELF = new Set(['BUILD_INFO', 'RELEASE_MANIFEST.sha256', 'RELEASE_SEAL']);
const MANIFEST = 'RELEASE_MANIFEST.sha256';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[release-info] dist/index.html missing — run `npm run build` first');
  process.exit(1);
}

const git = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

const release = git('rev-parse', 'HEAD');
const files = walk(DIST)
  .map((p) => path.relative(DIST, p))
  .filter((p) => !SELF.has(p))
  .sort();
const lines = files.map(
  (rel) => `${createHash('sha256').update(fs.readFileSync(path.join(DIST, rel))).digest('hex')}  ${rel}`,
);
const manifest = lines.join('\n') + '\n';
fs.writeFileSync(path.join(DIST, MANIFEST), manifest);

const info = {
  release: release || `nogit-${Date.now()}`,
  short: (release || '').slice(0, 7),
  branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  committed_at: git('show', '-s', '--format=%cI', 'HEAD'),
  built_at: new Date().toISOString(),
  dirty: release ? git('status', '--porcelain') !== '' : true,
  build_files: files.length,
};
fs.writeFileSync(path.join(DIST, 'BUILD_INFO'), JSON.stringify(info) + '\n');
console.log(
  `[release-info] ${info.short || info.release} files=${files.length} dirty=${info.dirty} ` +
    `build_manifest=${createHash('sha256').update(manifest).digest('hex').slice(0, 16)}`,
);
