const PHOTO = /\.(webp|png|jpe?g)(\?|$)/i;

/** How many products the homepage shows per tab. */
export const HOME_PRODUCT_LIMIT = 8;

type HomeProduct = { category: string; image?: string | null };

/** Local calendar day, e.g. "2026-10-16". Changes once a day, not on refresh. */
export function dailyKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** FNV-1a, 32-bit. Enough to spread ids evenly; not for security. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministic shuffle for one day: the same day gives the same order for
 * every visitor, and the order changes when the day changes.
 */
export function shuffleForDay<T extends { id: number }>(items: T[], day: string): T[] {
  return items
    .map((item) => ({ item, key: hash32(`${day}:${item.id}`) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

/**
 * Homepage grid. The "all" tab takes an even share from each category that
 * has a real photo, largest category first, then fills up to the limit.
 * A category tab is the same cap, not the whole catalogue. Within each
 * category the order rotates daily.
 */
export function pickHomeProducts<T extends HomeProduct & { id: number }>(
  products: T[],
  tab: string,
  day: string = dailyKey(),
): T[] {
  const photo = products.filter((p) => PHOTO.test(p.image || ''));
  if (tab !== 'all') {
    return shuffleForDay(photo.filter((p) => p.category === tab), day).slice(0, HOME_PRODUCT_LIMIT);
  }

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
  for (const [, list] of categories) {
    const items = shuffleForDay(list, day);
    picked.push(...items.slice(0, perCategory));
    rest.push(...items.slice(perCategory));
  }
  return [...picked, ...rest].slice(0, HOME_PRODUCT_LIMIT);
}

type AdProduct = HomeProduct & { id: number; stockQuantity?: number | null };

/** How many live-product ads the hero carries. */
export const HERO_AD_LIMIT = 4;

/**
 * Hero product ads. In-stock products with a real photo, shuffled for the day,
 * one per category first so the carousel is not four cables, then the rest.
 * The list is derived from the catalogue, so new products enter it without any edit.
 */
export function pickHeroAds<T extends AdProduct>(
  products: T[],
  limit = HERO_AD_LIMIT,
  day: string = dailyKey(),
): T[] {
  const fresh = shuffleForDay(
    products.filter((p) => PHOTO.test(p.image || '') && (p.stockQuantity == null || p.stockQuantity > 0)),
    day,
  );
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
