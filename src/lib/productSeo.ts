/**
 * Product-page SEO wording and social image. Pure module (no DOM, no DB):
 * imported by the server metadata injector (server/lib/seoMeta.ts) and by the
 * client (ProductDetail), so the raw HTML and the hydrated page cannot disagree.
 */

export const SITE_ORIGIN = 'https://janebiarena.ir';
/** The site's raster share card: social crawlers do not render SVG or AVIF. */
export const SHARE_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

/** Normalize free-text into a safe, bounded meta description. */
export function normalizeDescription(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const text = String(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 155 ? text.slice(0, 152).trimEnd() + '…' : text;
}

/**
 * Absolute social-card image for a product, or undefined when the product has
 * no image (the caller then keeps the site share card).
 * Legacy SVG art is replaced by the share card: crawlers would show no image.
 */
export function productSocialImage(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  const img = String(image).trim();
  if (!img) return undefined;
  if (/\.svgz?($|\?)/i.test(img)) return SHARE_IMAGE;
  return img.startsWith('http') ? img : `${SITE_ORIGIN}${img}`;
}

export interface ProductSeoInput {
  id: number | string;
  title: string;
  description?: string | null;
  image?: string | null;
}

export interface ProductSeo {
  title: string;
  description: string;
  canonical: string;
  image?: string;
}

/**
 * Head metadata for /products/:id (the plural form is canonical; /product/:id is
 * an alias that serves the same page). The description fallback states only
 * what the product page shows: no guarantee or price claim.
 */
export function productSeo(product: ProductSeoInput): ProductSeo {
  return {
    title: `${product.title} | جانبی آرنا`,
    description: normalizeDescription(
      product.description,
      `خرید ${product.title} از جانبی آرنا؛ قیمت و موجودی به‌روز.`
    ),
    canonical: `${SITE_ORIGIN}/products/${product.id}`,
    image: productSocialImage(product.image),
  };
}
