import { describe, it, expect, afterAll } from 'vitest';
import { breadcrumbJsonLdFor, injectBreadcrumbIntoHtml } from '../../server/lib/breadcrumbs.js';
import { db } from '../../server/db/index.js';
import { blogPosts } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Server-rendered BreadcrumbList JSON-LD on blog routes (SEO cluster
 * 2026-09-01). The injected markup must use the REAL post title from the DB
 * and be absent for unknown slugs / non-blog paths.
 */
const ts = Date.now();
const testId = `post-test-crumb-${ts}`;

afterAll(async () => {
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, testId));
  } catch {
    // best-effort cleanup
  }
});

describe('breadcrumbJsonLdFor — server-rendered BreadcrumbList', () => {
  it('returns null for non-blog paths', async () => {
    expect(await breadcrumbJsonLdFor('/')).toBeNull();
    expect(await breadcrumbJsonLdFor('/products')).toBeNull();
  });

  it('builds خانه/مجله crumbs for the blog listing', async () => {
    const ld = await breadcrumbJsonLdFor('/blog');
    expect(ld).toContain('"@type":"BreadcrumbList"');
    expect(ld).toContain('مجله');
    expect(ld).not.toContain('ListItem","position":3');
  });

  it('uses the real post title for a known slug and null for unknown slugs', async () => {
    await db.insert(blogPosts).values({
      id: testId,
      title: 'عنوان تست بردکرامب',
      excerpt: 'خلاصه',
      body: 'متن',
      published: true,
      createdAt: new Date().toISOString(),
    });

    const ld = await breadcrumbJsonLdFor(`/blog/${testId}`);
    expect(ld).toContain('"@type":"BreadcrumbList"');
    expect(ld).toContain('عنوان تست بردکرامب');

    expect(await breadcrumbJsonLdFor('/blog/post-test-never-created')).toBeNull();
  });

  it('injects into HTML before </head>', () => {
    const html = '<html><head><title>t</title></head><body></body></html>';
    const out = injectBreadcrumbIntoHtml(html, '<script type="application/ld+json">{}</script>');
    expect(out).toContain('</script>\n</head>');
    expect(injectBreadcrumbIntoHtml(html, null)).toBe(html);
  });
});
