// Product JSON-LD builder (SEO cluster r43)
// Shared by the client (ProductDetail hydration) and the server prerender
// (server/lib/breadcrumbs.ts) so both layers emit identical, honesty-gated
// structured data. Zero-fabrication: only fields that actually exist on the
// fetched product are emitted.
//
// Currency invariant: store prices are in Toman — emit `priceCurrency: 'IRT'`
// with the RAW price. Never pre-convert (×10 IRR) here; mixed units are the
// exact bug class that caused the 10x payment-path hazard.

interface ProductJsonLdInput {
  id?: number | string;
  title: string;
  description?: string | null;
  image?: string | null;
  brand?: string | null;
  sku?: string | null;
  category?: string | null;
  warranty?: string | null;
  price: number;
  discount?: number | null;
  stockQuantity?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  features?: string[] | null;
}

/** Resolve a possibly-relative image path against the site origin. */
export function absoluteImageUrl(image: string, origin: string): string {
  return image.startsWith('http') ? image : `${origin.replace(/\/$/, '')}${image}`;
}

/**
 * Build a schema.org Product object from real DB fields only.
 * Returns null when the product lacks a usable name.
 */
export function buildProductJsonLd(
  product: ProductJsonLdInput,
  origin: string = 'https://janebiarena.ir',
  url?: string
): Record<string, unknown> | null {
  const name = typeof product.title === 'string' ? product.title.trim() : '';
  if (!name) return null;

  const originBase = origin.replace(/\/$/, '');
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
  };

  if (product.id !== undefined && product.id !== null) jsonLd.identifier = String(product.id);
  if (product.sku && typeof product.sku === 'string' && product.sku.trim()) {
    jsonLd.sku = product.sku.trim();
  }

  if (product.image && typeof product.image === 'string' && product.image.trim()) {
    jsonLd.image = [absoluteImageUrl(product.image.trim(), originBase)];
  }

  const description = typeof product.description === 'string' ? product.description.trim() : '';
  if (description) jsonLd.description = description;

  const brand = typeof product.brand === 'string' ? product.brand.trim() : '';
  if (brand) jsonLd.brand = { '@type': 'Brand', name: brand };

  // additionalProperty — only real attributes (category / brand / warranty / features)
  const props: Array<Record<string, string>> = [];
  const category = typeof product.category === 'string' ? product.category.trim() : '';
  if (category) props.push({ '@type': 'PropertyValue', name: 'دسته‌بندی', value: category });
  if (brand) props.push({ '@type': 'PropertyValue', name: 'برند', value: brand });
  const warranty = typeof product.warranty === 'string' ? product.warranty.trim() : '';
  if (warranty) props.push({ '@type': 'PropertyValue', name: 'گارانتی', value: warranty });
  for (const feat of product.features ?? []) {
    if (typeof feat === 'string' && feat.trim()) {
      props.push({ '@type': 'PropertyValue', name: 'ویژگی', value: feat.trim() });
    }
  }
  if (props.length) jsonLd.additionalProperty = props;

  // offers — RAW Toman price with IRT currency; availability from real stock
  const price = Number(product.price);
  if (Number.isFinite(price) && price > 0) {
    jsonLd.offers = {
      '@type': 'Offer',
      priceCurrency: 'IRT',
      price: price.toString(),
      ...(url ? { url } : {}),
      availability:
        product.stockQuantity === undefined ||
        product.stockQuantity === null ||
        Number(product.stockQuantity) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    };
  }

  // aggregateRating — honesty gate: only when real reviews exist
  const rating = Number(product.rating ?? 0);
  const reviewsCount = Number(product.reviewsCount ?? 0);
  if (reviewsCount > 0 && rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.toString(),
      reviewCount: reviewsCount.toString(),
      bestRating: '5',
      worstRating: '1',
    };
  }

  jsonLd.inLanguage = 'fa-IR';
  return jsonLd;
}
