// Shared product-listing query builder — single source of truth for
// /api/products filter & sort params. Used by the Products page
// (useProductFilters) and curated listings (NewProducts, Offers) so the
// parameter names and sort keys can never drift apart.

interface ProductQueryOptions {
  category?: string;
  search?: string;
  brands?: string[];
  minPrice?: number | '';
  maxPrice?: number | '';
  onlyInStock?: boolean;
  onlyDiscounted?: boolean;
  /** Sort key as understood by the Products page controls (e.g. 'newest', 'discount-desc'). */
  sortBy?: string;
  page?: number;
  limit?: number;
}

export function buildProductQuery(opts: ProductQueryOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.category && opts.category !== 'همه') params.append('category', opts.category);
  if (opts.search) params.append('search', opts.search);
  if (opts.brands && opts.brands.length > 0) params.append('brands', opts.brands.join(','));
  if (opts.minPrice !== undefined && opts.minPrice !== '') params.append('minPrice', opts.minPrice.toString());
  if (opts.maxPrice !== undefined && opts.maxPrice !== '') params.append('maxPrice', opts.maxPrice.toString());
  if (opts.onlyInStock) params.append('inStock', 'true');
  if (opts.onlyDiscounted) params.append('hasDiscount', 'true');
  if (opts.sortBy && opts.sortBy !== 'default') params.append('sort', opts.sortBy);
  if (opts.page !== undefined) params.append('page', opts.page.toString());
  if (opts.limit !== undefined) params.append('limit', opts.limit.toString());
  return params.toString();
}
