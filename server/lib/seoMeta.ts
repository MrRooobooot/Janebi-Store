import { and, eq } from "drizzle-orm";
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
  /** The real LCP image for this route — preloaded so it is discoverable in the initial HTML. */
  preloadImage?: string;
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

// Static routes present in sitemap.xml — crawlers without JS must still get a
// distinct title/description (SEO health check 0913). Copy mirrors the page
// h1s in src/pages (no invented claims).
const STATIC_ROUTE_META: Record<string, Omit<RouteMeta, "ogUrl">> = {
  "/wishlist": {
    title: "علاقه‌مندی‌های من | جانبی آرنا",
    description: "فهرست کالاهای نشان‌شده برای خرید بعدی در فروشگاه جانبی آرنا.",
    ogType: "website",
  },
  "/compare": {
    title: "مقایسه محصولات | جانبی آرنا",
    description: "مقایسه مشخصات و قیمت لوازم جانبی موبایل در فروشگاه جانبی آرنا.",
    ogType: "website",
  },
  "/offers": {
    title: "پیشنهادهای ویژه و محدود | جانبی آرنا",
    description:
      "لیست لحظه‌ای تخفیف‌های جانبی آرنا: شارژر، کابل، گلس، قاب و هندزفری اورجینال با ارسال سریع به سراسر ایران.",
    ogType: "website",
  },
  "/new-products": {
    title: "جدیدترین محصولات جانبی آرنا",
    description:
      "تازه‌ترین لوازم جانبی موبایل وارد شده به فروشگاه جانبی آرنا؛ مدل‌های جدید شارژر، کابل، گلس و قاب با ضمانت اصالت.",
    ogType: "website",
  },
  "/brands": {
    title: "برندهای لوازم جانبی | جانبی آرنا",
    description:
      "مرکز خرید محصولات برندهای سامسونگ، اپل، شیائومی، انکر، بیسوس و سایر برندهای لوازم جانبی موبایل با گارانتی اصالت.",
    ogType: "website",
  },
  "/about": {
    title: "درباره جانبی آرنا | فروشگاه تخصصی لوازم جانبی",
    description:
      "داستان، مأموریت و افتخارات جانبی آرنا؛ مرجع تخصصی عرضه مستقیم لوازم جانبی موبایل و تبلت با ضمانت اصالت کالا.",
    ogType: "website",
  },
  "/contact": {
    title: "تماس با ما | پشتیبانی جانبی آرنا",
    description:
      "شماره تماس، واتساپ، اینستاگرام، تلگرام و ایمیل پشتیبانی جانبی آرنا؛ پاسخ‌گویی سریع به سؤالات و سفارش‌ها.",
    ogType: "website",
  },
  "/faq": {
    title: "سؤالات متداول | راهنمای خرید جانبی آرنا",
    description:
      "پاسخ پرسش‌های رایج درباره ارسال، مرجوعی، گارانتی اصالت، پرداخت امن و پیگیری سفارش در فروشگاه جانبی آرنا.",
    ogType: "website",
  },
  "/terms": {
    title: "شرایط و قوانین استفاده | جانبی آرنا",
    description:
      "قوانین ثبت سفارش، پرداخت، ارسال، مرجوعی و حریم خصوصی در فروشگاه اینترنتی جانبی آرنا.",
    ogType: "website",
  },
  "/privacy": {
    title: "سیاست حفظ حریم خصوصی | جانبی آرنا",
    description:
      "نحوه جمع‌آوری، نگهداری و حفاظت از اطلاعات شخصی و داده‌های سفارش کاربران جانبی آرنا.",
    ogType: "website",
  },
};

/** Fetch route-specific metadata. Returns null → caller keeps the generic shell tags. */
async function routeMetaFor(pathname: string): Promise<RouteMeta | null> {
  try {
    const stat = STATIC_ROUTE_META[pathname];
    if (stat) return { ...stat, ogUrl: `https://janebiarena.ir${pathname}` };

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

/** /products hub — also the canonical target for every filtered/sorted variant of it. */
const PRODUCTS_HUB_META: RouteMeta = {
  title: "خرید لوازم جانبی موبایل | جانبی آرنا",
  description:
    "لیست کامل محصولات جانبی آرنا: شارژر، پاوربانک، هندزفری، کابل و لوازم جانبی موبایل با قیمت روز و ارسال سریع.",
  ogType: "website",
  ogUrl: "https://janebiarena.ir/products",
};

/** Category landing page: `/products?category=<name>`.
 *
 * The filtered URL is its own canonical. It used to point at the hub, which made Google
 * file every category under "Alternate page with proper canonical tag" — a category page
 * could never rank for its own name. A stale/unknown category name must fall back to the
 * hub, not to the shell's homepage canonical, which produced
 * "Duplicate without user-selected canonical" pages attributed to the homepage.
 * The sitemap lists the %20-encoded form, so the canonical is encoded the same way.
 */
async function routeMetaForCategory(category: string | null): Promise<RouteMeta | null> {
  if (!category) return null;
  try {
    const row = await db
      .select({ category: products.category })
      .from(products)
      .where(and(eq(products.category, category), eq(products.isActive, 1)))
      .limit(1);
    if (!row[0]) return null;
    return {
      title: `خرید ${category} | جانبی آرنا`,
      description: normalizeDescription(
        null,
        `خرید انواع ${category} با بهترین قیمت، ضمانت اصالت و ارسال سریع از فروشگاه جانبی آرنا.`
      ),
      ogType: "website",
      ogUrl: `https://janebiarena.ir/products?category=${encodeURIComponent(category)}`,
    };
  } catch {
    return null;
  }
}

/** Resolve metadata for a request; query string included for category pages. */
export async function routeMetaForRequest(pathname: string, query: URLSearchParams): Promise<RouteMeta | null> {
  if (pathname === "/products" || pathname === "/products/") {
    const cat = query.get("category");
    if (cat) return (await routeMetaForCategory(cat)) ?? PRODUCTS_HUB_META;
    // SEO: the /products hub must not inherit the homepage shell canonical (r47 gap).
    return PRODUCTS_HUB_META;
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
  // Lighthouse's LCP-discovery insight: a hero image that only appears after React
  // hydration is not discoverable in the initial document (mobile LCP paid ~0.4s
  // for it). Preloading it here — server-rendered routes only — fixes that.
  if (meta.preloadImage && !/<link[^>]+rel="preload"[^>]+as="image"/.test(out)) {
    out = out.replace("</head>", `  <link rel="preload" as="image" href="${esc(meta.preloadImage)}" fetchpriority="high" />\n</head>`);
  }
  return out;
}

/** Fetch product og:image (absolute) when the product exists; null otherwise. */
export async function productOgImageFor(pathname: string): Promise<{ og: string; hero: string } | null> {
  const match = pathname.match(/^\/products?\/(\d+)\/?$/);
  if (!match) return null;
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, Number(match[1])),
    });
    if (!product?.image) return null;
    const img = String(product.image);
    // Social crawlers (Telegram/WhatsApp/Facebook/X) do not render SVG, so the
    // legacy local SVG art would produce a card with no image at all — fall back
    // to the site's raster share card instead.
    const absolute = (v: string) => (v.startsWith("http") ? v : `https://janebiarena.ir${v}`);
    // The <picture> element prefers AVIF, so that is the request Lighthouse counts as
    // LCP: preloading the JPEG sibling would download twice and help nothing. The
    // social card, however, must stay a raster JPEG/PNG — crawlers do not render AVIF
    // or SVG (the legacy local vector art falls back to the site share card).
    const avifSibling = img.match(/^(\/images\/products\/.+)\.(jpe?g|png)$/i);
    const hero = absolute(avifSibling ? `${avifSibling[1]}.avif` : img);
    if (/\.svgz?($|\?)/i.test(img)) return { og: "https://janebiarena.ir/og-image.jpg", hero };
    return { og: absolute(img), hero };
  } catch {
    return null;
  }
}
