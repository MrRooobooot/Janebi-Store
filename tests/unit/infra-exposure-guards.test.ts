import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guard: `app.set("trust proxy", 1)` in server/app.ts is only safe because of two
 * properties of the deployment, neither of which lives in the app's own code:
 *
 *   1. the app port is published on LOOPBACK ONLY, so no remote client can reach
 *      the Node process directly and hand it a forged X-Forwarded-For;
 *   2. nginx OVERWRITES X-Forwarded-For with $remote_addr on every proxied route,
 *      so a client-supplied chain never survives the hop.
 *
 * Break either one and rate limits (login 5/min, OTP, public 600/15min) become
 * trivially bypassable with a rotating header. This test is the tripwire.
 */
const repo = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(repo, p), 'utf8');

describe('deployment guards for `trust proxy`', () => {
  it('docker-compose publishes the app port on loopback only', () => {
    const compose = read('docker-compose.yml');
    const lists = [...compose.matchAll(/^[ \t]*ports:[ \t]*\n((?:[ \t]*-[ \t]*.*\n)+)/gm)];
    const entries = lists
      .flatMap((m) => m[1].trim().split('\n'))
      .map((line) => line.replace(/^[ \t]*-[ \t]*/, '').replace(/["']/g, '').trim())
      .filter(Boolean);

    expect(entries.length, 'docker-compose.yml must publish the app port').toBeGreaterThan(0);
    for (const entry of entries) {
      // "127.0.0.1:3000:3000" — host bind address must be loopback, never 0.0.0.0
      // and never a bare "3000:3000" (which docker binds to every interface).
      expect(entry, `port "${entry}" must bind 127.0.0.1 only`).toMatch(/^127\.0\.0\.1:\d+:\d+$/);
    }
  });

  it('nginx overwrites X-Forwarded-For on every proxied route', () => {
    const conf = read('deploy/nginx-janebi-store.conf');
    const lines = conf.split('\n');
    const offenders: string[] = [];

    lines.forEach((line, i) => {
      if (!/^\s*proxy_pass\s/.test(line)) return;
      const header = lines
        .slice(i, i + 10)
        .find((l) => /^\s*proxy_set_header\s+X-Forwarded-For\s/.test(l));
      if (!header) offenders.push(`line ${i + 1}: no X-Forwarded-For`);
      else if (!/\$remote_addr\s*;/.test(header)) {
        offenders.push(`line ${i + 1}: forwards the client's chain (${header.trim()})`);
      }
    });

    const passthroughs = lines.filter((l) => /^\s*proxy_pass\s/.test(l)).length;
    const headerSets = lines.filter((l) => /^\s*proxy_set_header\s+X-Forwarded-For\s/.test(l))
      .length;
    expect(passthroughs, 'nginx conf must proxy at least one route').toBeGreaterThan(0);
    expect(headerSets, 'every proxied route needs exactly one X-Forwarded-For setter').toBe(
      passthroughs,
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
