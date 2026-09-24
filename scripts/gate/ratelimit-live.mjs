#!/usr/bin/env node
// The rate limiters are skipped whenever NODE_ENV=test — which is exactly how vitest runs — so the
// unit suite can never prove they fire. This boots the real server (development env, scratch port,
// in-memory DB, no prod traffic) and proves the configured limits over real HTTP.
//
//   node scripts/gate/ratelimit-live.mjs
//
// Exits 0 only when: the burst target answers 429 at the configured attempt, the 429 carries the
// configured body + headers, and public reads stay unlimited at the same rate.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const PORT = Number(process.env.RATELIMIT_PORT || 3987);
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH_MAX = 5;        // server/app.ts: authLimiter, 5/min
const READ_BURST = 25;     // must stay far below the global /api/ limiter (600/15min)
const fails = [];
const note = (ok, msg) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}`);
  if (!ok) fails.push(msg);
};

const freePort = () => new Promise((resolve) => {
  const s = createServer();
  s.listen(PORT, '127.0.0.1', () => s.close(() => resolve(true)));
  s.on('error', () => resolve(false));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(deadlineMs = 30000) {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.status === 200) return true;
    } catch { /* not up yet */ }
    await sleep(400);
  }
  return false;
}

if (!(await freePort())) {
  console.error(`port ${PORT} is busy — set RATELIMIT_PORT`);
  process.exit(2);
}

const child = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(PORT),
    DATABASE_URL: process.env.RATELIMIT_DATABASE_URL || ':memory:',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'ratelimit-live-access-0001',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'ratelimit-live-refresh-0001',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d; });
child.stderr.on('data', (d) => { serverLog += d; });

const stop = () => {
  if (child.exitCode === null) child.kill('SIGTERM');
  setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 2000).unref();
};

try {
  if (!(await waitForHealth())) {
    note(false, `server never answered /api/health on ${BASE}`);
    console.error(serverLog.split('\n').slice(-15).join('\n'));
    process.exit(1);
  }
  note(true, `server up on ${BASE} (NODE_ENV=development → limiters active)`);

  // 1. Public reads must NOT be throttled at a normal browsing rate.
  const reads = [];
  for (let i = 0; i < READ_BURST; i++) reads.push(await fetch(`${BASE}/api/products?limit=2`));
  const readCodes = reads.map((r) => r.status);
  note(readCodes.every((c) => c === 200), `${READ_BURST} public reads /api/products → all 200 (${readCodes.join(',')})`);

  // 2. The auth limiter (5/min) must trip on the 6th attempt.
  const codes = [];
  let limited = null;
  for (let i = 1; i <= AUTH_MAX + 2; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '0000000000', password: 'x' }),
    });
    codes.push(r.status);
    if (r.status === 429 && !limited) {
      limited = { i, headers: r.headers, text: await r.text() };
    }
  }
  note(
    codes.slice(0, AUTH_MAX).every((c) => c !== 429),
    `attempts 1..${AUTH_MAX} were not rate-limited (${codes.join(',')})`,
  );
  note(limited !== null, `attempt ${AUTH_MAX + 1} got 429 (observed: ${codes.join(',')})`);
  if (limited) {
    const h = limited.headers;
    const limit = h.get('ratelimit-limit') || h.get('ratelimit') || '';
    note(String(limit).includes(String(AUTH_MAX)), `429 carries RateLimit-Limit=${limit} (expected ${AUTH_MAX})`);
    note((h.get('retry-after') || '').length > 0, `429 carries Retry-After=${h.get('retry-after')}`);
    let body = null;
    try { body = JSON.parse(limited.text); } catch { /* keep null */ }
    note(!!body && JSON.stringify(body).length > 10, `429 body is a JSON message: ${limited.text.slice(0, 120)}`);
    note(!/at .*\.ts:\d+|node_modules/.test(limited.text), '429 body leaks no internals');
  }

  // 3. A different route must keep working while the auth route is limited (per-route, not global).
  const after = await fetch(`${BASE}/api/categories`);
  note(after.status === 200, `another route still serves while auth is limited (/api/categories → ${after.status})`);
} finally {
  stop();
}

console.log(fails.length === 0
  ? '\n✅ rate-limit live proof passed'
  : `\n❌ rate-limit live proof FAILED (${fails.length}):\n - ${fails.join('\n - ')}`);
process.exit(fails.length === 0 ? 0 : 1);
