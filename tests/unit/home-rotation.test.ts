import { describe, expect, it } from 'vitest';
import { dailyKey, pickHeroAds, pickHomeProducts, shuffleForDay } from '../../src/lib/homeCatalogue';

const product = (id: number, category = 'کابل و سیم') => ({
  id,
  category,
  image: `/images/products/p${id}.webp`,
  stockQuantity: 5,
});

const catalogue = [
  ...Array.from({ length: 12 }, (_, i) => product(i + 1, 'کابل و سیم')),
  ...Array.from({ length: 12 }, (_, i) => product(i + 100, 'هولدر و نگهدارنده')),
];

describe('daily rotation', () => {
  it('gives the same order for the same day', () => {
    const a = pickHomeProducts(catalogue, 'all', '2026-10-16').map((p) => p.id);
    const b = pickHomeProducts(catalogue, 'all', '2026-10-16').map((p) => p.id);
    expect(a).toEqual(b);
  });

  it('changes the order when the day changes', () => {
    const today = pickHomeProducts(catalogue, 'all', '2026-10-16').map((p) => p.id);
    const tomorrow = pickHomeProducts(catalogue, 'all', '2026-10-17').map((p) => p.id);
    expect(tomorrow).not.toEqual(today);
  });

  it('keeps the category balance for the all tab', () => {
    const picked = pickHomeProducts(catalogue, 'all', '2026-10-17');
    expect(picked).toHaveLength(8);
    expect(picked.filter((p) => p.category === 'کابل و سیم')).toHaveLength(4);
    expect(picked.filter((p) => p.category === 'هولدر و نگهدارنده')).toHaveLength(4);
  });

  it('shuffles without dropping or duplicating items', () => {
    const shuffled = shuffleForDay(catalogue, '2026-10-16');
    expect(shuffled).toHaveLength(catalogue.length);
    expect(new Set(shuffled.map((p) => p.id)).size).toBe(catalogue.length);
  });

  it('keeps hero ads to one per category first and changes them daily', () => {
    const first = pickHeroAds(catalogue, 4, '2026-10-16');
    expect(first).toHaveLength(4);
    expect(new Set(first.slice(0, 2).map((p) => p.category)).size).toBe(2);
    const next = pickHeroAds(catalogue, 4, '2026-10-17').map((p) => p.id);
    expect(next).not.toEqual(first.map((p) => p.id));
  });

  it('builds a day key from the local calendar date', () => {
    expect(dailyKey(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
  });
});
