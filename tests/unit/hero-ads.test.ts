import { describe, it, expect } from 'vitest';
import { pickHeroAds } from '../../src/lib/homeCatalogue';

const p = (id: number, category: string, image = '/images/a.webp', stockQuantity: number | null = 5) => ({ id, category, image, stockQuantity });

describe('pickHeroAds', () => {
  it('takes one product per category first, rotating the pick each day', () => {
    const list = [p(1, 'A'), p(2, 'A'), p(3, 'B'), p(4, 'A')];
    const today = pickHeroAds(list, 3, '2026-10-16').map((x) => x.id);
    expect(new Set(today.slice(0, 2).map((id) => list.find((x) => x.id === id)!.category)).size).toBe(2);
    expect(pickHeroAds(list, 3, '2026-10-16').map((x) => x.id)).toEqual(today);
    expect(pickHeroAds(list, 3, '2026-10-17').map((x) => x.id)).not.toEqual(today);
  });

  it('skips products without a photo or out of stock', () => {
    const picked = pickHeroAds([p(1, 'A', ''), p(2, 'A', '/x.svg'), p(3, 'A', '/x.webp', 0), p(4, 'B')]).map((x) => x.id);
    expect(picked).toEqual([4]);
  });

  it('treats unknown stock as available and respects the limit', () => {
    const list = Array.from({ length: 9 }, (_, i) => p(i + 1, `C${i}`, '/x.webp', null));
    expect(pickHeroAds(list)).toHaveLength(4);
  });
});
