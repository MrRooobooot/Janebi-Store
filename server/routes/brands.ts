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
    // Real per-brand product counts + a REAL cover (first product image) for
    // brands without seed metadata — no invented assets, no empty gray tiles.
    const rows = await db
      .select({
        name: products.brand,
        count: sql<number>`count(*)`,
        cover: sql<string>`min(${products.image})`,
      })
      .from(products)
      .groupBy(products.brand);

    const live = new Map<string, { count: number; cover: string | null }>();
    for (const r of rows) live.set(r.name, { count: Number(r.count), cover: r.cover || null });

    const metaByName = new Map(ALL_BRANDS.map((b) => [b.name, b]));
    const seen = new Set<string>();

    const result = [];
    // Catalog brands first (keeps stable ordering + rich metadata)
    for (const b of ALL_BRANDS) {
      const liveInfo = live.get(b.name);
      const count = liveInfo?.count || 0;
      if (count > 0) {
        result.push({ ...b, count, image: b.image || liveInfo?.cover || undefined });
        seen.add(b.name);
      }
    }
    // Any product brand not in the catalog (operator-added) at the end
    for (const [name, info] of live.entries()) {
      if (!seen.has(name)) {
        const meta = metaByName.get(name);
        result.push({
          name,
          faName: meta?.faName || name,
          count: info.count,
          desc: meta?.desc || "",
          image: meta?.image || info.cover || undefined,
          ...(meta?.logo ? { logo: meta.logo } : {}),
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
