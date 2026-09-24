#!/usr/bin/env node
// Read-only production monitor: does the live API still answer, in time, with the shape the
// storefront depends on? Nothing here writes — GETs only, a handful of them, spaced out.
//
//   node scripts/monitoring/api-stats.mjs [--samples 3] [--base https://janebiarena.ir] [--json]
//
// Exit 1 when production is degraded: a 5xx, a non-429 non-200, a contract break, a p95 above the
// budget, or an endpoint that answers 429 to every sample (the limiter starving real users).
import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const SAMPLES = Number(arg('samples', 3));
const BASE = String(arg('base', process.env.PROD_BASE || 'https://janebiarena.ir')).replace(/\/$/, '');
const TIMEOUT = Number(arg('timeout', 20000));
const P95_BUDGET = Number(arg('p95-ms', 1500));
const AS_JSON = process.argv.includes('--json');
const GAP = Number(arg('gap-ms', 400));
const UA = 'janebi-api-monitor/1.0 (+read-only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const asArray = (b) => Array.isArray(b);
const ENDPOINTS = [
  { name: 'health', path: '/api/health' },
  { name: 'products list', path: '/api/products?limit=24', check: (b) => {
      if (!asArray(b)) return 'not an array';
      if (b.length === 0) return 'empty catalogue';
      for (const p of b) {
        if (typeof p.id !== 'number' || typeof p.title !== 'string' || typeof p.price !== 'number') {
          return `item shape broken: ${JSON.stringify(p).slice(0, 80)}`;
        }
      }
      return null;
    } },
  { name: 'categories', path: '/api/categories', check: (b) => (asArray(b) ? null : 'not an array') },
  { name: 'brands', path: '/api/brands', check: (b) => (asArray(b) ? null : 'not an array') },
  { name: 'blog', path: '/api/blog', check: (b) => (asArray(b) ? null : 'not an array') },
  { name: 'coupons active', path: '/api/coupons-active', check: (b) => (asArray(b) ? null : 'not an array') },
  { name: 'settings', path: '/api/settings', check: (b) => (b && typeof b === 'object' && !asArray(b) ? null : 'not an object') },
];

async function hit(path, { json = true } = {}) {
  const t0 = performance.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'user-agent': UA }, signal: ctl.signal });
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    let body = null;
    if (json) {
      try { body = JSON.parse(text); } catch { body = undefined; }
    }
    return { status: res.status, ms, bytes: text.length, body, text, headers: res.headers };
  } catch (e) {
    return { status: 0, ms: Math.round(performance.now() - t0), error: e.name === 'AbortError' ? `timeout >${TIMEOUT}ms` : String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

const p95 = (xs) => [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(0.95 * xs.length) - 1)];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const failures = [];
const warnings = [];
const rows = [];

for (const ep of ENDPOINTS) {
  const sample = [];
  for (let i = 0; i < SAMPLES; i++) {
    const r = await hit(ep.path, { json: true });
    sample.push(r);
    if (i < SAMPLES - 1) await sleep(GAP);
  }
  const times = sample.filter((s) => s.status > 0).map((s) => s.ms);
  const codes = sample.map((s) => s.status);
  const limited = sample.filter((s) => s.status === 429).length;
  const row = { endpoint: ep.name, path: ep.path, codes, times, bytes: sample[sample.length - 1].bytes };
  rows.push(row);

  if (limited === SAMPLES) failures.push(`${ep.name}: every sample was 429 — the limiter is starving real users`);
  else if (limited > 0) warnings.push(`${ep.name}: ${limited}/${SAMPLES} samples rate-limited (429)`);
  for (const s of sample) {
    if (s.error) failures.push(`${ep.name}: ${s.error}`);
    else if (s.status >= 500) failures.push(`${ep.name}: HTTP ${s.status}`);
    else if (s.status !== 200 && s.status !== 429) failures.push(`${ep.name}: unexpected HTTP ${s.status}`);
    else if (s.status === 200 && s.body === undefined) failures.push(`${ep.name}: 200 with a non-JSON body`);
  }
  if (ep.check) {
    const bad = sample.filter((s) => s.status === 200 && s.body !== undefined).map((s) => ep.check(s.body)).find(Boolean);
    if (bad) failures.push(`${ep.name}: contract broken — ${bad}`);
  }
  if (times.length && p95(times) > P95_BUDGET) failures.push(`${ep.name}: p95 ${p95(times)}ms > ${P95_BUDGET}ms budget`);
}

// One product detail, taken from the listing so the id is real.
let detailRow = null;
const list = await hit('/api/products?limit=1');
if (list.status === 200 && Array.isArray(list.body) && list.body[0]) {
  const r = await hit(`/api/products/${list.body[0].id}`);
  const times = [r.ms];
  detailRow = { endpoint: 'product detail', path: `/api/products/${list.body[0].id}`, codes: [r.status], times, bytes: r.bytes };
  rows.push(detailRow);
  if (r.status !== 200) failures.push(`product detail: HTTP ${r.status}`);
  else {
    const p = r.body || {};
    if (!Array.isArray(p.features)) failures.push('product detail: features is not an array');
    if ('costPrice' in p || 'barcode' in p) failures.push('product detail: wholesale field exposed (costPrice/barcode)');
  }
}

// The SPA shell itself — the API cannot be healthy while the app is not served.
const shell = await hit('/', { json: false });
rows.push({ endpoint: 'app shell', path: '/', codes: [shell.status], times: [shell.ms], bytes: shell.bytes });
if (shell.status !== 200) failures.push(`app shell: HTTP ${shell.status}`);
else if (!/id="root"|janebi/i.test(shell.text || '')) failures.push('app shell: no app marker in the HTML');

const summary = {
  at: new Date().toISOString(),
  base: BASE,
  samples: SAMPLES,
  budget_ms: P95_BUDGET,
  endpoints: rows.map((r) => ({
    endpoint: r.endpoint,
    path: r.path,
    codes: r.codes,
    min_ms: r.times.length ? Math.min(...r.times) : null,
    median_ms: r.times.length ? median(r.times) : null,
    p95_ms: r.times.length ? p95(r.times) : null,
    bytes: r.bytes,
  })),
  failures,
  warnings,
  ok: failures.length === 0,
};

try {
  appendFileSync(join(tmpdir(), 'janebi-api-stats.jsonl'), JSON.stringify(summary) + '\n');
} catch { /* trend file is best-effort */ }

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`production API monitor — ${BASE} (${SAMPLES} sample(s)/endpoint, p95 budget ${P95_BUDGET}ms)\n`);
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`${pad('endpoint', 18)}${pad('codes', 16)}${pad('min', 7)}${pad('p50', 7)}${pad('p95', 7)}bytes`);
  for (const e of summary.endpoints) {
    console.log(`${pad(e.endpoint, 18)}${pad(e.codes.join(','), 16)}${pad(e.min_ms ?? '-', 7)}${pad(e.median_ms ?? '-', 7)}${pad(e.p95_ms ?? '-', 7)}${e.bytes}`);
  }
  for (const w of warnings) console.log(`\n⚠️  ${w}`);
  for (const f of failures) console.log(`\n❌ ${f}`);
  console.log(failures.length === 0 ? '\n✅ production API healthy' : `\n❌ production API DEGRADED (${failures.length} failure(s))`);
  console.log(`trend line appended: ${join(tmpdir(), 'janebi-api-stats.jsonl')}`);
}
process.exit(failures.length === 0 ? 0 : 1);
