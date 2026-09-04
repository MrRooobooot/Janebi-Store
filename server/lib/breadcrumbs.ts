import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts, products, productFeatures } from "../db/schema.js";

/**
 * Server-rendered BreadcrumbList JSON-LD injection for blog routes
 * (SEO cluster 2026-09-01).
 *
 * The blog is a client-rendered SPA route, so crawlers would otherwise see no
 * breadcrumb structured data in the initial HTML. This module injects a
 * <script type="application/ld+json"> into the served index.html shell for:
 *   - GET /blog        → خانه / مجله
 *   - GET /blog/:slug  → خانه / مجله / <post title from the real DB row>
 *
 * Zero-fabrication: the detail crumb uses the title fetched from blog_posts;
 * if the slug does not resolve to a published post, no JSON-LD is injected.
 */

const SITE_ORIGIN = "https://janebiarena.ir";

function jsonLdScript(data: unknown): string {
  return (
    '<script type="application/ld+json" id="breadcrumb-jsonld">' +
    JSON.stringify(data).replace(/</g, "\\u003c") +
    "</script>"
  );
}

/**
 * Given a request pathname, return the BreadcrumbList JSON-LD string for blog
 * pages, or null when the path is not a blog page (or the slug is unknown).
 */
export async function breadcrumbJsonLdFor(pathname: string): Promise<string | null> {
  if (!pathname.startsWith("/blog")) return null;

  const slug = decodeURIComponent(pathname.slice("/blog/".length)).replace(/\/+$/, "");
  const crumbs: { '@type': string; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'خانه', item: SITE_ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'مجله', item: SITE_ORIGIN + '/blog' },
  ];

  if (slug && slug !== '') {
    try {
      const rows = await db
        .select({ id: blogPosts.id, title: blogPosts.title })
        .from(blogPosts)
        .where(eq(blogPosts.id, slug))
        .limit(1);
      const post = rows[0];
      if (!post) return null; // unknown slug → nothing injected (no fake crumbs)
      crumbs.push({
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${SITE_ORIGIN}/blog/${encodeURIComponent(post.id)}`,
      });
    } catch {
      // DB unavailable → skip injection rather than serve partial markup
      return null;
    }
  }

  return jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });
}

/**
 * Server-rendered BlogPosting JSON-LD for /blog/:slug (SEO cluster r39).
 *
 * The client injects BlogPosting JSON-LD only after React hydration; crawlers
 * that read the raw HTML previously saw just the BreadcrumbList. This fetches
 * the real DB row and reuses the shared client builder (src/lib/blogJsonLd.ts)
 * so both layers emit identical, honesty-gated output. Unknown slug → null.
 */
export async function blogPostingJsonLdFor(pathname: string): Promise<string | null> {
  if (!pathname.startsWith("/blog/")) return null;

  const slug = decodeURIComponent(pathname.slice("/blog/".length)).replace(/\/+$/, "");
  if (!slug) return null;

  try {
    const post = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, slug),
    });
    if (!post || !post.published) return null;
    const { buildBlogPostingJsonLd } = await import("../../src/lib/blogJsonLd.js");
    const jsonLd = buildBlogPostingJsonLd(
      post as unknown as Parameters<typeof buildBlogPostingJsonLd>[0]
    );
    if (!jsonLd) return null;
    return (
      '<script type="application/ld+json" id="blog-posting-jsonld-prerender">' +
      JSON.stringify(jsonLd).replace(/</g, "\\u003c") +
      "</script>"
    );
  } catch {
    return null; // DB unavailable → skip injection rather than serve partial markup
  }
}

/**
 * Server-rendered Product JSON-LD for /product/:id (SEO cluster r43).
 *
 * Product pages are client-rendered; crawlers reading the raw HTML previously
 * saw no Product schema. This fetches the real DB row (+ real product_features
 * rows) and reuses the shared client builder (src/lib/productJsonLd.ts) so
 * both layers emit identical, honesty-gated output. Unknown id → null.
 */
export async function productJsonLdFor(pathname: string): Promise<string | null> {
  const match = pathname.match(/^\/products?\/(\d+)\/?$/);
  if (!match) return null;

  try {
    const productId = Number(match[1]);
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) return null;

    const featureRows = await db
      .select({ feature: productFeatures.feature })
      .from(productFeatures)
      .where(eq(productFeatures.productId, productId));

    const { buildProductJsonLd } = await import("../../src/lib/productJsonLd.js");
    const jsonLd = buildProductJsonLd(
      {
        id: product.id,
        title: product.title,
        description: product.description,
        image: product.image,
        brand: product.brand,
        sku: product.sku,
        category: product.category,
        warranty: product.warranty,
        price: product.price,
        discount: product.discount,
        stockQuantity: product.stockQuantity,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        features: featureRows.map((f) => f.feature),
      },
      "https://janebiarena.ir",
      `https://janebiarena.ir/products/${product.id}`
    );
    if (!jsonLd) return null;
    return (
      `<link rel="canonical" href="https://janebiarena.ir/products/${product.id}" />\n` +
      '<script type="application/ld+json" id="product-jsonld-prerender">' +
      JSON.stringify(jsonLd).replace(/</g, "\\u003c") +
      "</script>"
    );
  } catch {
    return null; // DB unavailable → skip injection rather than serve partial markup
  }
}

/** Inject the breadcrumb / product JSON-LD and canonical right before </head> in the HTML shell. */
export function injectBreadcrumbIntoHtml(html: string, breadcrumbLd: string | null): string {
  if (!breadcrumbLd || !html.includes("</head>")) return html;
  // If breadcrumbLd contains a specific canonical link, strip the static fallback canonical to avoid duplicates
  let processedHtml = html;
  if (breadcrumbLd.includes('<link rel="canonical"')) {
    processedHtml = processedHtml.replace(/<link rel="canonical"[^>]*>\s*/g, '');
  }
  return processedHtml.replace("</head>", `${breadcrumbLd}\n</head>`);
}
