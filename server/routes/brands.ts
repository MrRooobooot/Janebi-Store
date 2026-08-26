import { Router } from "express";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { sql } from "drizzle-orm";
// Brand metadata (faName, logo, desc) comes from the seed catalog; product
// counts are computed LIVE from the DB — hardcoded counts (e.g. "42 محصول")
// promised products that didn't exist, so brand links led to empty pages.
import { ALL_BRANDS } from "../data/seed-data.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // Real per-brand product counts, plus brands that exist only in products.
    const rows = await db
      .select({ name: products.brand, count: sql<number>`count(*)` })
      .from(products)
      .groupBy(products.brand);

    const liveCounts = new Map<string, number>();
    for (const r of rows) liveCounts.set(r.name, Number(r.count));

    const metaByName = new Map(ALL_BRANDS.map((b) => [b.name, b]));
    const seen = new Set<string>();

    const result = [];
    // Catalog brands first (keeps stable ordering + rich metadata)
    for (const b of ALL_BRANDS) {
      const count = liveCounts.get(b.name) || 0;
      if (count > 0) {
        result.push({ ...b, count });
        seen.add(b.name);
      }
    }
    // Any product brand not in the catalog (operator-added) at the end
    for (const [name, count] of liveCounts.entries()) {
      if (!seen.has(name)) {
        result.push({
          name,
          faName: name,
          count,
          desc: "",
          ...(metaByName.get(name)?.logo ? { logo: metaByName.get(name)!.logo } : {}),
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Brands error:", error);
    res.status(500).json({ message: "خطای سرور در دریافت برندها" });
  }
});

export default router;
