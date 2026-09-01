import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts } from "../db/schema.js";

/**
 * Dynamic /sitemap.xml (SEO cluster 2026-09-02d).
 *
 * Serves the static entries from the checked-in public/sitemap.xml as the base
 * and appends one <url> per PUBLISHED blog post straight from the blog_posts
 * table — no hardcoded slugs that can drift. Zero-fabrication rules:
 *   - only posts that actually exist in the DB are appended;
 *   - the URL slug is the post's real DB id (the only unique identifier the
 *     blog_posts table has);
 *   - <lastmod> comes from the post's real createdAt and is OMITTED entirely
 *     when it is missing or not a parseable date.
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

/** YYYY-MM-DD from a real date string, or null when absent/invalid. */
function lastmodFromDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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
    '  <url><loc>' + SITE_ORIGIN + '/blog</loc><priority>0.6</priority></url>\n' +
    "</urlset>"
  );
}

router.get("/sitemap.xml", async (_req, res) => {
  const base = readStaticSitemap() ?? staticFallbackXml();

  let postEntries = "";
  try {
    const rows = await db
      .select({ id: blogPosts.id, createdAt: blogPosts.createdAt })
      .from(blogPosts)
      .where(eq(blogPosts.published, true));
    postEntries = rows
      .map((row) => {
        if (!row.id) return "";
        const lastmod = lastmodFromDate(row.createdAt);
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
  } catch (error) {
    // DB unavailable → serve the static base rather than a broken sitemap.
    console.error("Sitemap blog entries error:", error);
  }

  const xml = postEntries
    ? base.replace("</urlset>", `${postEntries}</urlset>`)
    : base;

  res
    .status(200)
    .set("Content-Type", "application/xml; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600")
    .send(xml);
});

export default router;
