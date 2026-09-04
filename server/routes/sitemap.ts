import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts, products } from "../db/schema.js";

/**
 * Dynamic /sitemap.xml (SEO cluster 2026-09-02d + dynamic catalog 2026-09-04).
 *
 * Serves the static root/category entries and appends all published blog posts
 * and active products straight from the database. Zero manual syncing.
 */
const router = Router();

const SITE_ORIGIN = "https://janebiarena.ir";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Blog URLs carry lastmod = today: every published post exists and is being
 * re-listed today, so search engines re-crawl. (Post createdAt dates are not
 * used — several were seeded with future dates, which is invalid for lastmod.)
 */
function lastmodForBlogUrl(_value: unknown, today: string): string {
  return today;
}

/** Bump the static /blog listing entry's lastmod to today. */
function refreshBlogListingLastmod(base: string, today: string): string {
  return base.replace(
    /(<loc>https:\/\/janebiarena\.ir\/blog<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/,
    `$1${today}$2`,
  );
}

/** Read the checked-in static sitemap as the base (public/, then dist/). */
function readStaticSitemap(): string | null {
  for (const candidate of ["public/sitemap.xml", "dist/sitemap.xml"]) {
    try {
      const file = path.resolve(process.cwd(), candidate);
      if (fs.existsSync(file)) return fs.readFileSync(file, "utf-8");
    } catch {
      // try next candidate
    }
  }
  return null;
}

function staticFallbackXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url><loc>' + SITE_ORIGIN + '/</loc><priority>1.0</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/products</loc><priority>0.9</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/offers</loc><priority>0.9</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/new-products</loc><priority>0.8</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/brands</loc><priority>0.8</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/about</loc><priority>0.5</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/contact</loc><priority>0.5</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/faq</loc><priority>0.5</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/terms</loc><priority>0.4</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/privacy</loc><priority>0.4</priority></url>\n' +
    '  <url><loc>' + SITE_ORIGIN + '/blog</loc><priority>0.6</priority></url>\n' +
    "</urlset>"
  );
}

router.get("/sitemap.xml", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rawBase = readStaticSitemap() ?? staticFallbackXml();
  // Strip hardcoded /product/1..14 from base so DB dynamically dictates all products
  const baseCleaned = rawBase.replace(/\s*<url>\s*<loc>https:\/\/janebiarena\.ir\/product\/\d+<\/loc>[\s\S]*?<\/url>/g, "");
  const base = refreshBlogListingLastmod(baseCleaned, today);

  let dynamicEntries = "";
  try {
    const [posts, prods] = await Promise.all([
      db
        .select({ id: blogPosts.id, createdAt: blogPosts.createdAt })
        .from(blogPosts)
        .where(eq(blogPosts.published, true)),
      db
        .select({ id: products.id })
        .from(products),
    ]);

    const postXml = posts
      .map((row) => {
        if (!row.id) return "";
        const lastmod = lastmodForBlogUrl(row.createdAt, today);
        const loc = `${SITE_ORIGIN}/blog/${encodeURIComponent(row.id)}`;
        return (
          "  <url>\n" +
          `    <loc>${xmlEscape(loc)}</loc>\n` +
          (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
          "    <changefreq>monthly</changefreq>\n" +
          "    <priority>0.6</priority>\n" +
          "  </url>\n"
        );
      })
      .join("");

    const prodXml = prods
      .map((p) => {
        if (!p.id) return "";
        const loc = `${SITE_ORIGIN}/products/${p.id}`;
        return (
          "  <url>\n" +
          `    <loc>${xmlEscape(loc)}</loc>\n` +
          `    <lastmod>${today}</lastmod>\n` +
          "    <changefreq>weekly</changefreq>\n" +
          "    <priority>0.7</priority>\n" +
          "  </url>\n"
        );
      })
      .join("");

    dynamicEntries = postXml + prodXml;
  } catch (error) {
    // DB unavailable → serve the static base rather than a broken sitemap.
    console.error("Sitemap dynamic entries error:", error);
  }

  const xml = dynamicEntries
    ? base.replace("</urlset>", `${dynamicEntries}</urlset>`)
    : base;

  res
    .status(200)
    .set("Content-Type", "application/xml; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600")
    .send(xml);
});

export default router;
