import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { productQuerySchema, idParamSchema, reviewSubmitSchema } from "../validators/index.js";
import { db } from "../db/index.js";
import { products, reviews } from "../db/schema.js";
import { eq, or, like, and, SQL, gte, lte, gt, inArray, desc, asc, sql } from "drizzle-orm";
import { appCache } from "../utils/cache.js";

const router = Router();

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

  const { category, search, limit, brands, minPrice, maxPrice, inStock, hasDiscount, sort, page } = req.query as any;
  
  const conditions: SQL[] = [];
  
  if (category && category !== "همه") {
    conditions.push(eq(products.category, category));
  }
  
  if (search) {
    const s = `%${search}%`;
    conditions.push(or(
      like(products.title, s),
      like(products.category, s),
      like(products.brand, s)
    )!);
  }
  
  if (brands) {
    const brandArray = brands.split(",");
    if (brandArray.length > 0) {
      conditions.push(inArray(products.brand, brandArray));
    }
  }

  if (minPrice) {
    conditions.push(gte(products.price, parseInt(minPrice)));
  }

  if (maxPrice) {
    conditions.push(lte(products.price, parseInt(maxPrice)));
  }

  if (inStock === "true") {
    conditions.push(gt(products.stockQuantity, 0));
  }

  if (hasDiscount === "true") {
    conditions.push(gt(products.discount, 0));
  }

  const finalCondition = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy: any = desc(products.id);
  if (sort) {
    switch (sort) {
      case "price-asc":
        orderBy = asc(products.price);
        break;
      case "price-desc":
        orderBy = desc(products.price);
        break;
      case "popular":
        orderBy = desc(products.rating);
        break;
      case "rating-desc":
        orderBy = desc(products.rating);
        break;
      case "reviews-desc":
        orderBy = desc(products.reviewsCount);
        break;
      case "discount-desc":
        orderBy = desc(products.discount);
        break;
      case "newest":
      default:
        orderBy = desc(products.id);
        break;
    }
  }

  const pageSize = limit ? parseInt(limit) : 20; // Default limit
  const currentPage = page ? parseInt(page) : 1;
  const offset = (currentPage - 1) * pageSize;

  const results = await db.query.products.findMany({
    where: finalCondition,
    limit: pageSize,
    offset,
    orderBy,
    with: {
      features: true
    }
  });

  // COUNT as a real SQL aggregate — the previous full findMany just to read
  // .length scanned every matching row per page request.
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(finalCondition);
  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

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
  
  const formatted = results.map(p => ({
    ...p,
    features: p.features.map(f => f.feature)
  }));

  appCache.set(cacheKey, formatted, 60, customHeaders);
  
  res.json(formatted);
});

router.get("/:id/reviews", validate(idParamSchema), async (req, res) => {
  const productId = parseInt(req.params.id as string);
  const cacheKey = `reviews:${productId}`;
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }
  
  const productReviews = await db.query.reviews.findMany({
    where: eq(reviews.productId, productId)
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
    unhelpfulCount: 0
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
      .where(eq(reviews.productId, productId));

    const newRating = Math.round(Number(agg[0]?.avg) * 10) / 10;
    await tx.update(products)
      .set({ rating: newRating, reviewsCount: Number(agg[0]?.count) || 0 })
      .where(eq(products.id, productId));
  });

  appCache.invalidate(`reviews:${productId}`);
  appCache.invalidate(`product:${productId}`);
  appCache.invalidate("products");
  
  res.status(201).json(newReview);
});

router.get("/:id", validate(idParamSchema), async (req, res) => {
  const id = parseInt(req.params.id as string);
  const cacheKey = `product:${id}`;
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }
  
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
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
