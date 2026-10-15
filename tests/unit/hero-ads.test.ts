import { describe, it, expect } from 'vitest';
import { pickHeroAds } from '../../src/lib/homeCatalogue';

const p = (id: number, category: string, image = '/images/a.webp', stockQuantity: number | null = 5) => ({ id, category, image, stockQuantity });

describe('pickHeroAds', () => {
  it('takes the newest product per category first, then fills with newer ones', () => {
    const picked = pickHeroAds([p(1, 'A'), p(2, 'A'), p(3, 'B'), p(4, 'A')], 3).map((x) => x.id);
    expect(picked).toEqual([4, 3, 2]);
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
