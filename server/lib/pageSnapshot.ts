/**
 * Raw-HTML content snapshot of product and blog-post pages for crawlers that do
 * not run JS (companion to catalogSnapshot.ts, which covers /products listings).
 *
 * Why: the head tags and JSON-LD of these pages were already server-rendered, but
 * `#root` shipped empty, so a crawler saw metadata with no visible page — the
 * "Crawled – currently not indexed" pattern. This puts the page's real text inside
 * `#root`; React replaces it when the client mounts.
 *
 * Invariants:
 * - Every value comes from the DB row the page itself renders. Nothing is invented:
 *   a missing description or feature list is simply omitted, never filled in.
 * - Price and availability follow the same rules the client uses (price is the
 *   stored sale price; `stockQuantity <= 0` is "ناموجود").
 * - Unknown or unpublished ids return null, so the caller keeps its 404 / plain
 *   shell behaviour.
 */
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { blogPosts, productFeatures, products } from '../db/schema.js';
import { toPersianDigits } from '../../src/lib/utils.js';
import { escapeHtml } from './seoMeta.js';

const formatToman = (value: number) => `${toPersianDigits(Number(value).toLocaleString('en-US'))} تومان`;

export interface ProductSnapshotInput {
  id: number;
  title: string;
  brand: string;
  category: string;
  price: number;
  stockQuantity: number;
  description?: string | null;
  warranty?: string | null;
  features: string[];
}

/** Pure: the visible product page text a crawler reads inside #root. */
export function renderProductSnapshotHtml(p: ProductSnapshotInput): string {
  const inStock = p.stockQuantity > 0;
  const features = p.features.filter((f) => f && f.trim());
  return (
    `<div id="product-prerender" data-prerendered="1">` +
    `<nav><a href="/">خانه</a> / <a href="/products">محصولات</a></nav>` +
    `<h1>${escapeHtml(p.title)}</h1>` +
    `<p>برند: ${escapeHtml(p.brand)} · دسته: ${escapeHtml(p.category)}</p>` +
    `<p>${formatToman(p.price)} — ${inStock ? 'موجود' : 'ناموجود'}</p>` +
    (p.warranty ? `<p>گارانتی: ${escapeHtml(p.warranty)}</p>` : '') +
    (p.description ? `<p>${escapeHtml(p.description)}</p>` : '') +
    (features.length
      ? `<h2>ویژگی‌ها</h2><ul>${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : '') +
    `</div>`
  );
}

export interface BlogSnapshotInput {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
}

/** Pure: the visible article text. Body paragraphs are separated by a blank line. */
export function renderBlogSnapshotHtml(post: BlogSnapshotInput): string {
  const paragraphs = post.body
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join('');
  return (
    `<div id="blog-prerender" data-prerendered="1">` +
    `<nav><a href="/">خانه</a> / <a href="/blog">مقالات</a></nav>` +
    `<article>` +
    `<h1>${escapeHtml(post.title)}</h1>` +
    `<p>${escapeHtml(post.author)} · ${escapeHtml(post.category)}</p>` +
    (post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : '') +
    paragraphs +
    `</article>` +
    `</div>`
  );
}

/** Snapshot HTML for `/product(s)/:id` or `/blog/:slug`; null for any other path or unknown row. */
export async function pageSnapshotFor(pathname: string): Promise<string | null> {
  const productMatch = pathname.match(/^\/products?\/(\d+)\/?$/);
  if (productMatch) {
    const id = Number(productMatch[1]);
    const product = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (!product) return null;
    const featureRows = await db
      .select({ feature: productFeatures.feature })
      .from(productFeatures)
      .where(eq(productFeatures.productId, id));
    return renderProductSnapshotHtml({
      id: product.id,
      title: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
      stockQuantity: product.stockQuantity,
      description: product.description,
      warranty: product.warranty,
      features: featureRows.map((r) => r.feature),
    });
  }

  if (pathname.startsWith('/blog/')) {
    let slug: string;
    try {
      slug = decodeURIComponent(pathname.slice('/blog/'.length)).replace(/\/+$/, '');
    } catch {
      return null; // malformed percent-encoding: no such post
    }
    if (!slug) return null;
    const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, slug) });
    if (!post || !post.published) return null;
    return renderBlogSnapshotHtml(post);
  }

  return null;
}

/** Replace the empty SPA mount with the snapshot. */
export function injectRootContent(html: string, contentHtml: string): string {
  return html.replace('<div id="root"></div>', `<div id="root">${contentHtml}</div>`);
}
