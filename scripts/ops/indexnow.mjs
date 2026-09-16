// IndexNow push: Bing/Yandex/Seznam accept an instant URL notification without any
// account — the site proves ownership by hosting /<key>.txt. Google does not use
// IndexNow (it needs Search Console), so this complements the sitemap, never replaces it.
// Usage: node scripts/ops/indexnow.mjs [--dry]
const HOST = "janebiarena.ir";
const KEY = "c276fa18a698331a170b989421aab2f6";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;

const xml = await (await fetch(SITEMAP, { signal: AbortSignal.timeout(15000) })).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
if (!urls.length) { console.error("no URLs in sitemap — aborting"); process.exit(1); }
console.log(`sitemap: ${urls.length} URLs`);

const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls.slice(0, 10000) };
if (process.argv.includes("--dry")) { console.log("dry run:", JSON.stringify(body).slice(0, 120), "..."); process.exit(0); }

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(15000),
});
console.log(`indexnow -> ${res.status} ${res.statusText}`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
