import { describe, expect, it } from 'vitest';
import { pickHomeProducts } from '../../src/lib/homeCatalogue';

const holder = (n: number, image = `/images/products/h${n}.webp`) => ({
  id: n,
  category: 'هولدر و نگهدارنده',
  image,
});
const cable = (n: number) => ({ id: n, category: 'کابل و سیم', image: `/images/products/c${n}.webp` });

describe('pickHomeProducts', () => {
  const products = [
    ...Array.from({ length: 7 }, (_, i) => cable(i + 1)),
    ...Array.from({ length: 38 }, (_, i) => holder(i + 10)),
    holder(99, '/products/hld-13.svg'),
  ];

  it('gives the all tab four photos from each live category, holders first', () => {
    const picked = pickHomeProducts(products, 'all');
    expect(picked).toHaveLength(8);
    expect(picked.filter((p) => p.category === 'هولدر و نگهدارنده')).toHaveLength(4);
    expect(picked.filter((p) => p.category === 'کابل و سیم')).toHaveLength(4);
    expect(picked.slice(0, 4).every((p) => p.category === 'هولدر و نگهدارنده')).toBe(true);
    expect(picked.some((p) => p.image.endsWith('.svg'))).toBe(false);
  });

  it('caps a category tab at eight photos', () => {
    const picked = pickHomeProducts(products, 'هولدر و نگهدارنده');
    expect(picked).toHaveLength(8);
    expect(picked.every((p) => p.category === 'هولدر و نگهدارنده')).toBe(true);
    expect(picked.some((p) => p.image.endsWith('.svg'))).toBe(false);
  });
});
