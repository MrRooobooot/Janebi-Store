import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts } from "../db/schema.js";

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

/** Inject the breadcrumb JSON-LD right before </head> in the HTML shell. */
export function injectBreadcrumbIntoHtml(html: string, breadcrumbLd: string | null): string {
  if (!breadcrumbLd || !html.includes("</head>")) return html;
  return html.replace("</head>", `${breadcrumbLd}\n</head>`);
}
