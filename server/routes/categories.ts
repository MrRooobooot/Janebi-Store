import { Router } from "express";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { appCache } from "../utils/cache.js";

const router = Router();

router.get("/", async (req, res) => {
  const cacheKey = "categories:all";
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }

  // GROUP BY aggregate instead of loading every product row into JS.
  const rows = await db
    .select({
      category: products.category,
      count: sql<number>`count(*)`,
      image: sql<string>`min(${products.image})`,
    })
    .from(products)
    .groupBy(products.category);

  const result = rows.map((r, i) => ({
    id: i + 1,
    title: r.category,
    image: r.image,
    count: Number(r.count),
    slug: r.category.toLowerCase().replace(/\s+/g, "-"),
  }));

  appCache.set(cacheKey, result, 120);
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, max-age=120");
  res.json(result);
});

export default router;
