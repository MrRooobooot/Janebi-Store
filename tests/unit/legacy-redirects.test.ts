// Guard test: LEGACY_PRODUCT_REDIRECTS must never contain a LIVE product id.
// Regression for 2026-09-18 find: map included ids 2..14 which were live rows,
// 301-ing real PDPs (and their indexed URLs + JSON-LD) to /products.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function liveIdsFromSeed(): number[] {
  const src = readFileSync(resolve(__dirname, '../../server/data/seed-data.ts'), 'utf-8');
  const ids = [...src.matchAll(/\bid:\s*(\d+)/g)].map(m => Number(m[1]));
  return ids;
}

describe('LEGACY_PRODUCT_REDIRECTS safety', () => {
  it('contains no id that exists in the live catalogue seed', () => {
    const src = readFileSync(
      resolve(__dirname, '../../server/data/legacyProductRedirects.ts'),
      'utf-8'
    );
    const mapped = [...src.matchAll(/^\s*(\d+):/gm)].map(m => Number(m[1]));
    const live = liveIdsFromSeed();
    const overlap = mapped.filter(id => live.includes(id));
    expect(overlap, `redirect map contains LIVE product ids: ${overlap.join(', ')}`).toEqual([]);
  });
});
