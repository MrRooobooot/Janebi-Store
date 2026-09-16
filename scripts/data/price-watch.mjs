// Price watch: how far is our catalogue from the market band Torob shows?
//
// For every branded SKU we derive a search query (brand + model code taken from the
// title), ask Torob for the live offers, then cluster them by price to separate the
// two bands that always exist in Iran: a grey/no-warranty cluster and the
// mainstream (warrantied) cluster. Shop count weights the clusters, because a band
// with 130 sellers is the price users actually see, not the single 0-shop outlier.
//
// Usage: node scripts/price-watch.mjs [--limit N] [--json out.json] [--md out.md]
import { execFileSync } from "node:child_process";

const BASE = process.env.SITE || "https://janebiarena.ir";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

const args = process.argv.slice(2);
const argOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const LIMIT = Number(argOf("--limit") || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Torob renders counts in Persian digits ("در ۱۳۰ فروشگاه") — normalise first. */
const fa2en = (v) => String(v).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/** Model codes in a Persian product title: alphanumerics with a digit, 3+ chars. */
function modelCode(title) {
  const tokens = String(title).match(/[A-Za-z0-9][A-Za-z0-9-]{2,}/g) || [];
  return (
    tokens
      .filter((t) => /\d/.test(t) && !/^\d+$/.test(t))
      .filter((t) => t.length >= 3)
      .sort((a, b) => b.length - a.length)[0] || null
  );
}

/**
 * Torob answers Node's fetch with HTTP 490 (anti-bot) but serves curl fine, so the
 * request goes through curl — the same client the manual probes used.
 */
function torobFetchOnce(q) {
  const url = "https://api.torob.com/v4/base-product/search/?q=" + encodeURIComponent(q) + "&page=0&size=12";
  return execFileSync(
    "curl",
    ["-s", "-m", "25", "-A", UA, "-H", "Accept: application/json", "-H", "Accept-Language: fa-IR,fa;q=0.9", url],
    { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 },
  );
}

async function torobSearch(q) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = torobFetchOnce(q);
    if (raw.trimStart().startsWith("<")) {
      // WAF/rate-limit challenge answers with HTML: back off instead of pushing harder.
      await sleep(15000 * (attempt + 1));
      continue;
    }
    try {
      return (JSON.parse(raw || "{}").results) || [];
    } catch {
      await sleep(5000);
    }
  }
  throw new Error("torob blocked (html after retries)");
}

/** Cluster offers by price (±12%) and return the band with the most sellers. */
function bands(offers, model) {
  const needle = String(model || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rows0 = needle
    ? offers.filter((o) => String(o.name1 || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(needle))
    : offers;
  const rows = (rows0.length ? rows0 : offers)
    .filter((o) => Number(o.price) > 0)
    .map((o) => ({
      price: Number(o.price),
      shops: Number((fa2en(o.shop_text || "").replace(/[٫,]/g, "").match(/(\d+)/) || [0, 0])[1]),
      name: String(o.name1 || ""),
    }))
    .sort((a, b) => a.price - b.price);
  if (!rows.length) return null;
  const clusters = [];
  for (const r of rows) {
    const c = clusters.find((c) => Math.abs(r.price - c.prices[0]) / c.prices[0] < 0.12);
    if (c) { c.prices.push(r.price); c.shops += r.shops; c.names.push(r.name); }
    else clusters.push({ prices: [r.price], shops: r.shops, names: [r.name] });
  }
  clusters.sort((a, b) => b.shops - a.shops || a.prices[0] - b.prices[0]);
  const main = clusters[0];
  const exact = rows0.length > 0 && !!needle;
  return {
    min: rows[0].price,
    exact,
    mainstream: Math.min(...main.prices),
    mainstreamShops: main.shops,
    mainstreamSample: main.names[0]?.slice(0, 60),
    clusters: clusters.slice(0, 3).map((c) => ({ from: Math.min(...c.prices), shops: c.shops })),
  };
}

const list = await (await fetch(`${BASE}/api/products?limit=200`, { signal: AbortSignal.timeout(20000) })).json();
const items = Array.isArray(list) ? list : list.products || list.items || [];
const branded = items.filter((p) => (p.brand || "متفرقه") !== "متفرقه" && p.price > 0);
const targets = LIMIT ? branded.slice(0, LIMIT) : branded;
console.log(`catalogue ${items.length} · branded ${branded.length} · checking ${targets.length}`);

const out = [];
for (const p of targets) {
  const model = modelCode(p.title);
  if (!model) { out.push({ id: p.id, brand: p.brand, title: String(p.title).slice(0, 70), our: p.price, model: null, skipped: "no model code" }); continue; }
  const query = `${p.brand} ${model}`.trim();
  try {
    const offers = await torobSearch(query);
    const b = bands(offers, model);
    out.push({
      id: p.id, brand: p.brand, title: String(p.title).slice(0, 70), our: p.price, model, offers: offers.length,
      marketMin: b?.min ?? null, marketMain: b?.mainstream ?? null, marketShops: b?.mainstreamShops ?? null,
      deltaMainPct: b?.mainstream ? Math.round(((p.price - b.mainstream) / b.mainstream) * 1000) / 10 : null,
      deltaMinPct: b?.min ? Math.round(((p.price - b.min) / b.min) * 1000) / 10 : null,
      bands: b?.clusters ?? [],
      confidence: (b?.exact ? "model-matched" : "brand-only") + (b?.mainstreamShops >= 5 ? "+deep" : ""),
    });
  } catch (e) {
    out.push({ id: p.id, brand: p.brand, title: String(p.title).slice(0, 70), our: p.price, model, error: String(e.message).slice(0, 60) });
  }
  await sleep(3000);
}

const jsonPath = argOf("--json") || "/tmp/price-watch.json";
await import("node:fs").then((fs) => fs.writeFileSync(jsonPath, JSON.stringify(out, null, 1)));
const scored = out.filter((r) => typeof r.deltaMainPct === "number" && typeof r.marketMain === "number").sort((a, b) => b.deltaMainPct - a.deltaMainPct);
console.log(`\nchecked ${out.length} · matched ${scored.length}`);
console.log("delta vs mainstream band (shop-weighted):");
for (const r of scored.slice(0, 25)) {
  console.log(`  ${String(r.deltaMainPct).padStart(6)}% | ours ${r.our.toLocaleString("en-US").padStart(12)} | band ${r.marketMain.toLocaleString("en-US").padStart(12)} (${r.marketShops} shops) | ${r.brand} ${r.model} | ${r.title.slice(0, 42)}`);
}
const md = [
  "# Price watch — فاصلهٔ قیمت ما با باند بازار (ترب)",
  "",
  `تاریخ اجرا: ${new Date().toISOString()} · SKU بررسی‌شده: ${out.length}`,
  "",
  "| delta vs باند اصلی | قیمت ما | باند اصلی | فروشنده‌های باند | کمینهٔ ترب | اعتبار تطبیق | برند و مدل | کالا |",
  "|---:|---:|---:|---:|---:|---|---|---|",
  ...scored.map((r) => `| ${r.deltaMainPct}% | ${(r.our ?? 0).toLocaleString("en-US")} | ${(r.marketMain ?? 0).toLocaleString("en-US")} | ${r.marketShops} | ${(r.marketMin ?? 0).toLocaleString("en-US")} | ${r.confidence} | ${r.brand} ${r.model} | ${r.title} |`),
].join("\n");
const mdPath = argOf("--md") || "/tmp/price-watch.md";
await import("node:fs").then((fs) => fs.writeFileSync(mdPath, md));
console.log(`\nwrote ${jsonPath} and ${mdPath}`);
