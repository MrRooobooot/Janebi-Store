/**
 * Regression harness for scripts/ops/release.sh rollback safety.
 *
 * Runs the real release.sh in a temporary git repo against a temporary "server"
 * directory. No SSH, Docker, network or VPS access: `ssh`, `rsync`, `docker`,
 * `curl`, `sleep`, `tee`, `shasum` and `mv -T` are local shims placed first on PATH.
 * They act only on the temp directories. Nothing is written to the real repo's
 * data/ or to the real /tmp probe log.
 *
 * Covers the two layouts release.sh can meet on the server:
 *   - dist is a symlink to an earlier release (the layout after the first switch)
 *   - dist is a real directory (the first switch)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readlinkSync,
  rmSync, symlinkSync, cpSync, copyFileSync, chmodSync, unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// RELEASE_OPS_DIR lets the same suite run against another copy of the scripts
// (e.g. the pre-fix release.sh from git) to confirm the tests catch the bug.
const OPS_DIR = process.env.RELEASE_OPS_DIR ?? fileURLToPath(new URL('../../scripts/ops/', import.meta.url));

const SHIMS: Record<string, string> = {
  ssh: `#!/bin/bash
# Local stand-in for ssh: runs the remote command string in a local bash.
while [ "$1" = "-o" ]; do shift 2; done
shift
exec bash -c "$1"
`,
  rsync: `#!/bin/bash
# Local stand-in for rsync: copies the source directory to the path after "host:".
src=""; dest=""
while [ $# -gt 0 ]; do
  case "$1" in
    -e) shift 2; continue;;
    -*) ;;
    *) src="$dest"; dest="$1";;
  esac
  shift
done
dest="\${dest#*:}"
mkdir -p "$dest" && cp -R "$src". "$dest"
`,
  docker: `#!/bin/bash
# Local stand-in for docker: a compose call marks the container as recreated (used by
# the curl shim to fail health only AFTER the switch), and the live server.cjs hash
# lookup returns data.
case "$*" in *compose*) touch "$HARNESS_APP/.recreated";; esac
if [ "$1" = "exec" ] && printf '%s ' "$@" | grep -q 'sha256sum /app/dist/server.cjs'; then
  echo "$(shasum -a 256 "$HARNESS_APP/dist/server.cjs" | cut -d' ' -f1)  /app/dist/server.cjs"
fi
exit 0
`,
  curl: `#!/bin/bash
# Local stand-in for curl: serves the app's BUILD_INFO, health 200 unless the test fails it.
for a in "$@"; do
  case "$a" in *BUILD_INFO) cat "$HARNESS_APP/dist/BUILD_INFO"; exit 0;; esac
done
if [ "\${HARNESS_HEALTH_FAIL:-0}" = "1" ] && [ -e "$HARNESS_APP/.recreated" ]; then echo 500; else echo 200; fi
`,
  sleep: `#!/bin/bash
exit 0
`,
  tee: `#!/bin/bash
# Local stand-in for tee: the probe log goes to the test's temp dir, never the real /tmp.
args=()
for a in "$@"; do
  case "$a" in /tmp/janebi_predeploy_db_probe.txt) args+=("$HARNESS_LOG");; *) args+=("$a");; esac
done
exec /usr/bin/tee "\${args[@]}"
`,
  wc: `#!/bin/bash
# Local stand-in for GNU wc. The remote side is Linux, where wc does not pad its
# count; BSD wc does, which would make the zero-byte guard compare " 0" with "0".
/usr/bin/wc "$@" | sed 's/^ *//'
`,
  shasum: `#!/bin/bash
# Local stand-in for \`shasum -a 256\` (same algorithm and output format as sha256sum).
if [ "$1" = "-a" ]; then shift 2; fi
exec sha256sum "$@"
`,
  mv: `#!/bin/bash
# Local stand-in for GNU \`mv -Tf\` (BSD mv has no -T). Replaces the destination
# itself: a symlink is removed as a link and never followed into its target.
if [ "$1" = "-Tf" ]; then
  rm -f -- "$3"
  exec /bin/mv -- "$2" "$3"
fi
exec /bin/mv "$@"
`,
};

let root = '';
let repo = '';
let shimDir = '';
let shortA = '';
let shortB = '';
let buildA = '';
let buildB = '';

function git(args: string[], cwd: string): string {
  const r = spawnSync('git', ['-c', 'user.name=release-test', '-c', 'user.email=release-test@invalid', ...args], {
    cwd, encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// Builds dist/ for the current HEAD. The identity files come from the real release-info.mjs.
function buildDist(marker: string): string {
  const dist = path.join(repo, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), `<html>${marker}</html>\n`);
  writeFileSync(path.join(dist, 'server.cjs'), `// server ${marker}\n`);
  writeFileSync(path.join(dist, 'assets', 'app.js'), `console.log('${marker}');\n`);
  const r = spawnSync('node', [path.join(repo, 'scripts/ops/release-info.mjs')], { cwd: repo, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`release-info failed: ${r.stderr}`);
  const snapshot = mkdtempSync(path.join(root, `build-${marker}-`));
  cpSync(dist, snapshot, { recursive: true });
  return snapshot;
}

function envFor(app: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${shimDir}:${process.env.PATH ?? ''}`,
    REMOTE: 'harness',
    APP: app,
    CONTAINER: 'harness-app',
    HOST: 'http://127.0.0.1:9',
    HARNESS_APP: app,
    HARNESS_LOG: path.join(root, 'probe.log'),
    ...extra,
  };
}

// Simulates a server that already runs release `shortA`, laid out as `kind`.
function makeServer(kind: 'symlink' | 'real'): string {
  const app = mkdtempSync(path.join(root, 'app-'));
  const relA = path.join(app, 'releases', shortA);
  mkdirSync(path.join(relA), { recursive: true });
  cpSync(buildA, path.join(relA, 'dist'), { recursive: true });
  // Same shape as the live release: the seal is written by release.sh step 2.
  writeFileSync(path.join(relA, 'dist', 'RELEASE_SEAL'), `{"release":"${shortA}"}\n`);
  cpSync(path.join(repo, 'drizzle'), path.join(relA, 'drizzle'), { recursive: true });
  if (kind === 'symlink') {
    symlinkSync(`releases/${shortA}/dist`, path.join(app, 'dist'));
  } else {
    cpSync(buildA, path.join(app, 'dist'), { recursive: true });
    writeFileSync(path.join(app, 'dist', 'RELEASE_SEAL'), `{"release":"${shortA}"}\n`);
  }
  return app;
}

function runRelease(app: string, extra: Record<string, string> = {}) {
  return spawnSync('bash', [path.join(repo, 'scripts/ops/release.sh')], {
    cwd: repo, encoding: 'utf8', env: envFor(app, extra),
  });
}

// Executes the rollback line that release.sh printed, exactly as an operator would.
function runPrintedRollback(output: string, app: string) {
  const line = output.split('\n').find((l) => l.startsWith('rollback: ssh '));
  expect(line, 'release.sh must print a rollback command').toBeTruthy();
  const m = /^rollback: ssh \S+ "(.*)"$/.exec(line as string);
  expect(m, 'printed rollback command must be well formed').toBeTruthy();
  return spawnSync('bash', ['-c', (m as RegExpExecArray)[1]], { encoding: 'utf8', env: envFor(app) });
}

// The target is read from the rollback command that release.sh prints, because that
// is the path an operator would actually use.
function printedTarget(output: string): string {
  const m = /ln -sfn (\S+) \.dist\.next/.exec(output);
  expect(m, 'printed rollback command must name its target').toBeTruthy();
  return (m as RegExpExecArray)[1];
}

function servedShort(app: string): string {
  return JSON.parse(readFileSync(path.join(app, 'dist', 'BUILD_INFO'), 'utf8')).short;
}

function manifestVerifies(dir: string): boolean {
  return spawnSync('sha256sum', ['-c', '--quiet', 'RELEASE_MANIFEST.sha256'], { cwd: dir }).status === 0;
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'release-rollback-'));
  repo = path.join(root, 'repo');
  shimDir = path.join(root, 'bin');
  mkdirSync(shimDir);
  for (const [name, body] of Object.entries(SHIMS)) {
    const file = path.join(shimDir, name);
    writeFileSync(file, body);
    chmodSync(file, 0o755);
  }

  mkdirSync(path.join(repo, 'scripts', 'ops'), { recursive: true });
  for (const f of ['release.sh', 'release-info.mjs', 'probe-db.mjs']) {
    copyFileSync(path.join(OPS_DIR, f), path.join(repo, 'scripts', 'ops', f));
  }
  writeFileSync(path.join(repo, '.gitignore'), 'dist/\n');
  mkdirSync(path.join(repo, 'drizzle', 'sqlite'), { recursive: true });
  writeFileSync(path.join(repo, 'drizzle', 'sqlite', '0001.sql'), 'CREATE TABLE t (id INTEGER);\n');
  git(['init', '-q'], repo);
  git(['add', '-A'], repo);
  git(['commit', '-q', '-m', 'release A'], repo);
  shortA = git(['rev-parse', '--short', 'HEAD'], repo);
  buildA = buildDist('release-A');

  writeFileSync(path.join(repo, 'CHANGE.txt'), 'release B\n');
  git(['add', '-A'], repo);
  git(['commit', '-q', '-m', 'release B'], repo);
  shortB = git(['rev-parse', '--short', 'HEAD'], repo);
  buildB = buildDist('release-B');
  expect(buildA).not.toBe(buildB);
  // The rebuilt dist for HEAD (B) is what release.sh ships.
  expect(git(['status', '--porcelain'], repo)).toBe('');
}, 60000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('release.sh rollback target', () => {
  it('symlink layout: keeps the previous release and prints a path that exists', () => {
    const app = makeServer('symlink');
    const run = runRelease(app);
    expect(run.status, run.stdout + run.stderr).toBe(0);

    // dist now points at the new release; the previous one is untouched.
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortB}/dist`);
    expect(servedShort(app)).toBe(shortB);
    const relA = path.join(app, 'releases', shortA, 'dist');
    expect(JSON.parse(readFileSync(path.join(relA, 'BUILD_INFO'), 'utf8')).short).toBe(shortA);
    expect(manifestVerifies(relA)).toBe(true);
    expect(existsSync(path.join(app, 'releases', `prev-${shortA}-dist`))).toBe(false);

    const target = printedTarget(run.stdout);
    expect(target).toBe(`releases/${shortA}/dist`);
    expect(existsSync(path.join(app, target, 'BUILD_INFO'))).toBe(true);

    const rb = runPrintedRollback(run.stdout, app);
    expect(rb.status, rb.stdout + rb.stderr).toBe(0);
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortA}/dist`);
    expect(servedShort(app)).toBe(shortA);
  }, 60000);

  it('symlink layout: a failed health check still leaves a usable printed rollback', () => {
    const app = makeServer('symlink');
    const run = runRelease(app, { HARNESS_HEALTH_FAIL: '1' });
    expect(run.status).not.toBe(0);
    expect(run.stdout + run.stderr).toContain('did not come back healthy');
    // The switch happened before the failed check, so the rollback line must already be printed.
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortB}/dist`);
    expect(run.stdout).toContain(`releases/${shortA}/dist`);

    const rb = runPrintedRollback(run.stdout, app);
    expect(rb.status, rb.stdout + rb.stderr).toBe(0);
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortA}/dist`);
    expect(servedShort(app)).toBe(shortA);
  }, 60000);

  it('real-directory layout: moves the live tree to prev-<old> and prints that path', () => {
    const app = makeServer('real');
    const run = runRelease(app);
    expect(run.status, run.stdout + run.stderr).toBe(0);

    const prev = path.join(app, 'releases', `prev-${shortA}-dist`);
    expect(JSON.parse(readFileSync(path.join(prev, 'BUILD_INFO'), 'utf8')).short).toBe(shortA);
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortB}/dist`);

    const target = printedTarget(run.stdout);
    expect(target).toBe(`releases/prev-${shortA}-dist`);
    expect(existsSync(path.join(app, target, 'BUILD_INFO'))).toBe(true);

    const rb = runPrintedRollback(run.stdout, app);
    expect(rb.status, rb.stdout + rb.stderr).toBe(0);
    expect(readlinkSync(path.join(app, 'dist'))).toBe(target);
    expect(servedShort(app)).toBe(shortA);
  }, 60000);

  it('refuses to switch when the symlink target is not a complete release', () => {
    const app = makeServer('symlink');
    unlinkSync(path.join(app, 'releases', shortA, 'dist', 'RELEASE_SEAL'));
    const run = runRelease(app);
    expect(run.status).not.toBe(0);
    expect(run.stdout + run.stderr).toContain('not a complete release');
    // Nothing was switched: dist still points at the old release.
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortA}/dist`);
    expect(servedShort(app)).toBe(shortA);
  }, 60000);

  it('refuses to switch when dist already points at the release being shipped', () => {
    const app = makeServer('symlink');
    const relB = path.join(app, 'releases', shortB);
    mkdirSync(relB, { recursive: true });
    cpSync(buildB, path.join(relB, 'dist'), { recursive: true });
    cpSync(path.join(repo, 'drizzle'), path.join(relB, 'drizzle'), { recursive: true });
    unlinkSync(path.join(app, 'dist'));
    symlinkSync(`releases/${shortB}/dist`, path.join(app, 'dist'));
    const run = runRelease(app);
    expect(run.status).not.toBe(0);
    expect(run.stdout + run.stderr).toContain('no distinct rollback target');
    expect(readlinkSync(path.join(app, 'dist'))).toBe(`releases/${shortB}/dist`);
  }, 60000);
});
