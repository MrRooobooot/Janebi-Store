import { Router } from "express";
import { db } from "../db/index.js";
import { appCache } from "../utils/cache.js";

const router = Router();

router.get("/", async (req, res) => {
  const cacheKey = "categories:all";
  const cached = appCache.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }

  const allProducts = await db.query.products.findMany();
  const categoriesMap = new Map<string, any>();
  
  for (const p of allProducts) {
    if (!categoriesMap.has(p.category)) {
      categoriesMap.set(p.category, {
        id: categoriesMap.size + 1,
        title: p.category,
        image: p.image,
        count: 1,
        slug: p.category.toLowerCase().replace(/\s+/g, "-")
      });
    } else {
      categoriesMap.get(p.category).count++;
    }
  }
  
  const result = Array.from(categoriesMap.values());
  appCache.set(cacheKey, result, 120);
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, max-age=120");
  res.json(result);
});

export default router;
