import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts, products } from "../db/schema.js";

/**
 * Server-side per-route SEO metadata (title / description / Open Graph).
 *
 * Injected into the raw HTML shell for crawlers that do not execute JS.
 * Zero-fabrication rules: metadata comes only from real DB rows
 * (products / blog_posts) or static route definitions; unknown routes
 * fall back to the generic homepage metadata already present in the shell.
 */

interface RouteMeta {
  title: string;
  description: string;
  ogType: "website" | "product" | "article";
  ogUrl: string;
  ogImage?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Normalize free-text into a safe, bounded meta description. */
function normalizeDescription(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const text = String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 155 ? text.slice(0, 152).trimEnd() + "…" : text;
}

function homeFallback(): RouteMeta {
  return {
    title: "جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت",
    description:
      "فروشگاه تخصصی جانبی آرنا؛ خرید انواع قاب و کاور گوشی، گلس نشکن، شارژر اصل، کابل، پاوربانک و هولدر با تضمین کیفیت، بهترین قیمت و ارسال سریع به سراسر ایران.",
    ogType: "website",
    ogUrl: "https://janebiarena.ir/",
  };
}

/** Fetch route-specific metadata. Returns null → caller keeps the generic shell tags. */
async function routeMetaFor(pathname: string): Promise<RouteMeta | null> {
  try {
    // Product detail: /product/:id and /products/:id (canonical = plural form)
    const productMatch = pathname.match(/^\/products?\/(\d+)\/?$/);
    if (productMatch) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, Number(productMatch[1])),
      });
      if (!product) return null;
      const url = `https://janebiarena.ir/products/${product.id}`;
      const title = `${product.title} | جانبی آرنا`;
      const description = normalizeDescription(
        product.description,
        `خرید ${product.title} با بهترین قیمت و ضمانت اصالت از جانبی آرنا.`
      );
      return { title, description, ogType: "product", ogUrl: url };
    }

    // Blog article: /blog/:slug
    if (pathname.startsWith("/blog/")) {
      const slug = decodeURIComponent(pathname.slice("/blog/".length)).replace(/\/+$/, "");
      if (!slug) return null;
      const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, slug) });
      if (!post || !post.published) return null;
      const url = `https://janebiarena.ir/blog/${encodeURIComponent(post.id)}`;
      return {
        title: `${post.title} | مجله جانبی آرنا`,
        description: normalizeDescription(
          post.excerpt,
          `${post.title} — در مجله جانبی آرنا.`
        ),
        ogType: "article",
        ogUrl: url,
      };
    }

    // Blog listing
    if (pathname === "/blog") {
      return {
        title: "مجله جانبی آرنا | راهنمای خرید و معرفی لوازم جانبی",
        description:
          "مقالات، راهنمای خرید و نقد و بررسی لوازم جانبی موبایل؛ شارژر، پاوربانک، هندزفری و کابل در مجله جانبی آرنا.",
        ogType: "website",
        ogUrl: "https://janebiarena.ir/blog",
      };
    }

    // Category listing: /products?category=<name> (query read by caller via originalUrl)
    const categoryMatch = pathname.match(/^\/products\/?$/) || null;
    if (categoryMatch) return null; // handled by routeMetaForWithQuery below

    return null;
  } catch {
    return null; // DB unavailable → keep generic shell metadata
  }
}

/** Category variant: caller passes the decoded `category` query value (may be absent). */
async function routeMetaForCategory(category: string | null): Promise<RouteMeta | null> {
  if (!category) return null;
  try {
    const row = await db
      .select({ category: products.category, n: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.category, category))
      .groupBy(products.category)
      .limit(1);
    if (!row[0]) return null;
    const url = `https://janebiarena.ir/products?category=${encodeURIComponent(category)}`;
    return {
      title: `خرید ${category} | جانبی آرنا`,
      description: normalizeDescription(
        null,
        `خرید انواع ${category} با بهترین قیمت، ضمانت اصالت و ارسال سریع از فروشگاه جانبی آرنا.`
      ),
      ogType: "website",
      ogUrl: url,
    };
  } catch {
    return null;
  }
}

/** Resolve metadata for a request; query string included for category pages. */
export async function routeMetaForRequest(pathname: string, query: URLSearchParams): Promise<RouteMeta | null> {
  if (pathname === "/products" || pathname === "/products/") {
    const cat = query.get("category");
    if (cat) return routeMetaForCategory(cat);
    return null;
  }
  return routeMetaFor(pathname);
}

/** Replace generic shell <title>/<meta>/og tags with route-specific ones (escaped, UTF-8 safe). */
export function injectSeoMetadata(html: string, meta: RouteMeta): string {
  if (!html.includes("</head>")) return html;
  const esc = escapeHtml;
  let out = html;
  // Keep exactly one canonical tag, matching og:url exactly (single indexing signal).
  out = out.replace(/<link[^>]*rel="canonical"[^>]*>\s*/gi, "");
  out = out.replace("</head>", `<link rel="canonical" href="${esc(meta.ogUrl)}" />\n</head>`);
  const setTag = (regex: RegExp, replacement: string) => {
    if (regex.test(out)) out = out.replace(regex, replacement);
    else out = out.replace("</head>", `${replacement}\n</head>`);
  };
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  setTag(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );
  setTag(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(meta.title)}" />`);
  setTag(
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${esc(meta.description)}" />`
  );
  setTag(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(meta.ogUrl)}" />`);
  setTag(/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(meta.ogType)}" />`);
  if (meta.ogImage) {
    setTag(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(meta.ogImage)}" />`);
  }
  return out;
}

/** Fetch product og:image (absolute) when the product exists; null otherwise. */
export async function productOgImageFor(pathname: string): Promise<string | null> {
  const match = pathname.match(/^\/products?\/(\d+)\/?$/);
  if (!match) return null;
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, Number(match[1])),
    });
    if (!product?.image) return null;
    const img = String(product.image);
    return img.startsWith("http") ? img : `https://janebiarena.ir${img}`;
  } catch {
    return null;
  }
}
