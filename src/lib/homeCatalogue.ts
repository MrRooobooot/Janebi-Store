const PHOTO = /\.(webp|png|jpe?g)(\?|$)/i;

/** How many products the homepage shows per tab. */
export const HOME_PRODUCT_LIMIT = 8;

type HomeProduct = { category: string; image?: string | null };

/**
 * Homepage grid. The "all" tab takes an even share from each category that
 * has a real photo, largest category first, then fills up to the limit.
 * A category tab is the same cap, not the whole catalogue.
 */
export function pickHomeProducts<T extends HomeProduct>(products: T[], tab: string): T[] {
  const photo = products.filter((p) => PHOTO.test(p.image || ''));
  if (tab !== 'all') return photo.filter((p) => p.category === tab).slice(0, HOME_PRODUCT_LIMIT);

  const groups = new Map<string, T[]>();
  for (const product of photo) {
    const list = groups.get(product.category) ?? [];
    list.push(product);
    groups.set(product.category, list);
  }
  const categories = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (categories.length === 0) return [];

  const perCategory = Math.floor(HOME_PRODUCT_LIMIT / categories.length);
  const picked: T[] = [];
  const rest: T[] = [];
  for (const [, items] of categories) {
    picked.push(...items.slice(0, perCategory));
    rest.push(...items.slice(perCategory));
  }
  return [...picked, ...rest].slice(0, HOME_PRODUCT_LIMIT);
}

type AdProduct = HomeProduct & { id: number; stockQuantity?: number | null };

/** How many live-product ads the hero carries. */
export const HERO_AD_LIMIT = 4;

/**
 * Hero product ads. Newest in-stock products with a real photo, one per
 * category first so the carousel is not four cables, then the rest. The list is
 * derived from the catalogue, so new products enter it without any edit.
 */
export function pickHeroAds<T extends AdProduct>(products: T[], limit = HERO_AD_LIMIT): T[] {
  const fresh = products
    .filter((p) => PHOTO.test(p.image || '') && (p.stockQuantity == null || p.stockQuantity > 0))
    .sort((a, b) => b.id - a.id);
  const seen = new Set<string>();
  const first: T[] = [];
  const rest: T[] = [];
  for (const p of fresh) {
    if (seen.has(p.category)) rest.push(p);
    else {
      seen.add(p.category);
      first.push(p);
    }
  }
  return [...first, ...rest].slice(0, limit);
}
