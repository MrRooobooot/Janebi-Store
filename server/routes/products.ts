import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { productQuerySchema, numericIdParamSchema, reviewSubmitSchema } from "../validators/index.js";
import { db, sqlite, fts5Available } from "../db/index.js";
import { products, reviews } from "../db/schema.js";
import { eq, or, and, SQL, gte, lte, gt, inArray, desc, asc, sql } from "drizzle-orm";
import { likeWithEscape, containsLikePattern } from "../utils/like";

import { DEFAULT_CATALOG_PAGE_SIZE } from "../../src/lib/constants.js";
import { appCache } from "../utils/cache.js";
import { storeEvents } from "../services/events.js";

const router = Router();

/**
 * FTS5 search: prefix-match every whitespace-separated token across
 * title/brand/category. "کابل سامسونگ" → `کابل* سامسونگ*`. Query params are
 * parameterized (the MATCH arg is bound, tokens are sanitized to strip
 * FTS5 query syntax so user input can never inject operators).
 */
function ftsSearchCondition(search: string): SQL | null {
  if (!fts5Available || !sqlite) return null;
  const tokens = String(search)
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((t) => t.replace(/["*()^:{}[\]-]/g, "").trim())
    .filter(Boolean)
    .map((t) => `"${t}"*`)
    .join(" ");
  if (!tokens) return null;
  try {
    const ids = sqlite
      .prepare(
        `SELECT product_id FROM products_fts WHERE products_fts MATCH ? LIMIT 400`
      )
      .all(tokens) as { product_id: number }[];
    if (ids.length === 0) {
      // Match-nothing sentinel: preserve "no results" semantics.
      return sql`1 = 0`;
    }
    return inArray(products.id, ids.map((r) => r.product_id));
  } catch (err) {
    console.warn("FTS5 search failed, falling back to LIKE:", (err as Error).message);
    return null;
  }
}

export interface CatalogQueryParams {
  category?: string;
  search?: string;
  brands?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  hasDiscount?: string;
  sort?: string;
  limit?: string | number;
  page?: string | number;
}

function catalogOrderBy(sort?: string): any {
  switch (sort) {
    case "price-asc":
      return asc(products.price);
    case "price-desc":
      return desc(products.price);
    case "popular":
    case "rating-desc":
      return desc(products.rating);
    case "reviews-desc":
      return desc(products.reviewsCount);
    case "discount-desc":
      return desc(products.discount);
    case "newest":
    default:
      return desc(products.id);
  }
}

/**
 * The ONE place a public catalogue URL is turned into SQL. Used by
 * `GET /api/products` and by the server-side raw-HTML prerender
 * (server/lib/catalogSnapshot.ts), so a crawler without JS and a rendered
 * browser can never be shown two different listings for the same URL — and the
 * page size is the shared DEFAULT_CATALOG_PAGE_SIZE the client asks for.
 */
export async function queryCatalogue(params: CatalogQueryParams) {
  const conditions: SQL[] = [];

  // Soft-hide: is_active=0 keeps a product out of every public listing while the
  // row survives for order history (order_items FK). Only the admin list shows it.
  conditions.push(eq(products.isActive, 1));

  if (params.category && params.category !== "همه") {
    conditions.push(eq(products.category, params.category));
  }

  if (params.search) {
    const fts = ftsSearchCondition(String(params.search));
    if (fts) {
      conditions.push(fts);
    } else {
      const s = containsLikePattern(String(params.search));
      conditions.push(
        or(
          likeWithEscape(products.title, s),
          likeWithEscape(products.category, s),
          likeWithEscape(products.brand, s)
        )!
      );
    }
  }

  // `brand` (singular) is the public URL param spelled by the brand directory
  // (src/pages/static/Brands.tsx → /products?brand=X); `brands` (plural,
  // comma-separated) is what the catalogue hook sends. Same concept, two
  // spellings — accept both so a link can never silently list everything.
  const brandParam = params.brands || params.brand;
  if (brandParam) {
    const brandArray = String(brandParam)
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    if (brandArray.length > 0) {
      conditions.push(inArray(products.brand, brandArray));
    }
  }

  if (params.minPrice) {
    conditions.push(gte(products.price, parseInt(String(params.minPrice))));
  }

  if (params.maxPrice) {
    conditions.push(lte(products.price, parseInt(String(params.maxPrice))));
  }

  if (params.inStock === "true") {
    conditions.push(gt(products.stockQuantity, 0));
  }

  if (params.hasDiscount === "true") {
    conditions.push(gt(products.discount, 0));
  }

  const finalCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = catalogOrderBy(params.sort);
  const pageSize = params.limit ? parseInt(String(params.limit)) : DEFAULT_CATALOG_PAGE_SIZE;
  const currentPage = params.page ? parseInt(String(params.page)) : 1;
  const offset = (currentPage - 1) * pageSize;

  const results = await db.query.products.findMany({
    where: finalCondition,
    limit: pageSize,
    offset,
    orderBy,
    // costPrice is wholesale and barcode is a supplier-reconciliation field:
    // neither belongs in a public response (isActive is admin-only too).
    columns: { costPrice: false, barcode: false, isActive: false },
    with: {
      features: true,
    },
  });

  // COUNT as a real SQL aggregate — the previous full findMany just to read
  // .length scanned every matching row per page request.
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(finalCondition);
  const total = Number(countRows[0]?.count ?? 0);

  return {
    items: results.map((p) => ({ ...p, features: p.features.map((f) => f.feature) })),
    total,
    pageSize,
    currentPage,
    totalPages: Math.ceil(total / pageSize),
  };
}

router.get("/", validate(productQuerySchema), async (req, res) => {
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const cached = appCache.get(cacheKey);

  if (cached) {
    if (cached.headers) {
      for (const [k, v] of Object.entries(cached.headers)) {
        res.setHeader(k, v);
      }
    }
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }

  const { category, search, limit, brands, brand, minPrice, maxPrice, inStock, hasDiscount, sort, page } = req.query as any;

  // Same query builder the raw-HTML prerender uses (single source of truth).
  const { items: formatted, total, totalPages, currentPage } = await queryCatalogue({
    category,
    search,
    limit,
    brands,
    brand,
    minPrice,
    maxPrice,
    inStock,
    hasDiscount,
    sort,
    page,
  });

  const customHeaders: Record<string, string> = {
    "X-Total-Count": total.toString(),
    "X-Total-Pages": totalPages.toString(),
    "X-Current-Page": currentPage.toString(),
  };

  res.setHeader("X-Total-Count", customHeaders["X-Total-Count"]);
  res.setHeader("X-Total-Pages", customHeaders["X-Total-Pages"]);
  res.setHeader("X-Current-Page", customHeaders["X-Current-Page"]);
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, max-age=30");

  appCache.set(cacheKey, formatted, 60, customHeaders);
  
  res.json(formatted);
});

router.get("/:id/reviews", validate(numericIdParamSchema), async (req, res) => {
  const productId = parseInt(req.params.id as string);

  // Pagination mode: when ?page or ?limit is provided, respond with
  // { reviews, total, page, pages }. Without params, keep the legacy
  // plain-array shape for backward compatibility.
  const pageParam = req.query.page !== undefined ? parseInt(String(req.query.page), 10) : undefined;
  const limitParam = req.query.limit !== undefined ? parseInt(String(req.query.limit), 10) : undefined;
  const paginated = pageParam !== undefined || limitParam !== undefined;

  if (paginated) {
    const page = Number.isFinite(pageParam) && pageParam! > 0 ? pageParam! : 1;
    const limit = Number.isFinite(limitParam) && limitParam! > 0 ? Math.min(limitParam!, 50) : 6;

    const countRows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.approved, true)));
    const total = Number(countRows[0]?.count) || 0;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);

    const rows = await db.query.reviews.findMany({
      where: and(eq(reviews.productId, productId), eq(reviews.approved, true)),
      orderBy: sql`${reviews.date} desc, ${reviews.id} desc`,
      limit,
      offset: (safePage - 1) * limit,
    });

    return res.json({ reviews: rows, total, page: safePage, pages, limit });
  }

  const cacheKey = `reviews:${productId}`;
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }
  
  const productReviews = await db.query.reviews.findMany({
    where: and(eq(reviews.productId, productId), eq(reviews.approved, true)),
    orderBy: sql`${reviews.date} desc, ${reviews.id} desc`,
  });

  appCache.set(cacheKey, productReviews, 60);
  res.setHeader("X-Cache", "MISS");
  res.json(productReviews);
});

router.post("/:id/reviews", validate(reviewSubmitSchema), async (req, res) => {
  const productId = parseInt(req.params.id as string);

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId)
  });

  if (!product) {
    return res.status(404).json({ message: "محصول یافت نشد" });
  }

  const { userName, rating, title, comment, recommend } = req.body;

  const newReview = {
    id: `rev-${Date.now()}`,
    productId,
    userName,
    rating,
    title,
    comment,
    recommend,
    date: new Date().toISOString().split("T")[0],
    isVerifiedBuyer: false,
    helpfulCount: 0,
    unhelpfulCount: 0,
    approved: false,
  };

  await db.transaction(async (tx) => {
    await tx.insert(reviews).values(newReview);

    // Recompute the product's aggregate rating + review count so listings
    // and sort-by-rating reflect real reviews (previously stale forever).
    const agg = await tx
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.approved, true)));

    const newRating = Math.round(Number(agg[0]?.avg) * 10) / 10;
    await tx.update(products)
      .set({ rating: newRating, reviewsCount: Number(agg[0]?.count) || 0 })
      .where(eq(products.id, productId));
  });

  appCache.invalidate(`reviews:${productId}`);
  appCache.invalidate(`product:${productId}`);
  appCache.invalidate('products');
  appCache.invalidate('reviews:latest');
  
  storeEvents.emit('review:created', {
    reviewId: newReview.id,
    productId,
    productTitle: product.title,
    userName: newReview.userName,
    rating: newReview.rating,
    comment: newReview.comment,
  });

  res.status(201).json(newReview);
});

router.get("/:id", validate(numericIdParamSchema), async (req, res) => {
  const id = parseInt(req.params.id as string);
  const cacheKey = `product:${id}`;
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }
  
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.isActive, 1)),
    // costPrice is wholesale and barcode is a supplier-reconciliation field:
    // neither belongs in a public response (isActive is admin-only too).
    columns: { costPrice: false, barcode: false, isActive: false },
    with: {
      features: true
    }
  });
  
  if (product) {
    const formatted = {
      ...product,
      features: product.features.map(f => f.feature)
    };
    appCache.set(cacheKey, formatted, 60);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(formatted);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
});

export default router;
