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
