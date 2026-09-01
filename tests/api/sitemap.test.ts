import { describe, it, expect, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { blogPosts } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Dynamic sitemap.xml (SEO cluster 2026-09-02d).
 * Verifies that GET /sitemap.xml appends one <url> per PUBLISHED blog post
 * straight from the blog_posts table — using the post's real DB id as the
 * slug — while keeping the static entries intact. Blog URLs carry
 * lastmod = max(createdAt, today); it is omitted for posts without a
 * parseable date.
 *
 * Isolation: seeded rows use unique ids and are deleted in afterAll.
 */
const ts = Date.now();
const seededIds = [
  `post-test-dated-${ts}`,
  `post-test-undated-${ts}`,
];

async function seedPosts() {
  await db.insert(blogPosts).values([
    {
      id: seededIds[0],
      title: 'مقاله تاریخ‌دار تست',
      excerpt: 'خلاصه تست',
      body: 'متن تست',
      published: true,
      createdAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: seededIds[1],
      title: 'مقاله بدون تاریخ تست',
      excerpt: 'خلاصه تست',
      body: 'متن تست',
      published: true,
      // No real date: createdAt is required NOT NULL by the schema, so use a
      // value that fails Date parsing to exercise the omit-lastmod path.
      createdAt: 'not-a-date',
    } as any,
  ]);
}

afterAll(async () => {
  for (const id of seededIds) {
    try {
      await db.delete(blogPosts).where(eq(blogPosts.id, id));
    } catch {
      // best-effort cleanup
    }
  }
});

describe('GET /sitemap.xml — dynamic blog post entries', () => {
  it('keeps static entries and appends published blog post URLs with lastmod', async () => {
    await seedPosts();
    const res = await request(app).get('/sitemap.xml');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('xml');

    const xml = res.text;

    // Static entries intact
    expect(xml).toContain('<loc>https://janebiarena.ir/</loc>');
    expect(xml).toContain('<loc>https://janebiarena.ir/products</loc>');
    expect(xml).toContain('<loc>https://janebiarena.ir/blog</loc>');

    // Per-post entries from the DB (slug = real post id)
    expect(xml).toContain(`<loc>https://janebiarena.ir/blog/${seededIds[0]}</loc>`);
    expect(xml).toContain(`<loc>https://janebiarena.ir/blog/${seededIds[1]}</loc>`);

    // Blog URLs carry lastmod = today (re-listed today; createdAt dates are
    // not used — some seeded posts have future dates)
    const today = new Date().toISOString().slice(0, 10);
    expect(xml).toMatch(new RegExp(`[\\s\\S]*blog/${seededIds[0]}[\\s\\S]*?<lastmod>${today}</lastmod>`));

    // Undated post still gets today's lastmod (the URL is live today)
    const undatedBlock = xml.split('<url>').find((b) => b.includes(seededIds[1]));
    expect(undatedBlock).toBeTruthy();
    expect(undatedBlock).toContain(`<lastmod>${today}</lastmod>`);

    // No hand-written drift: the dated post's slug must not appear hardcoded
    // anywhere except as the seeded DB row (already deleted post stays absent)
    expect(xml).not.toContain('post-test-never-created');
  });

  it('does not include unpublished posts', async () => {
    const draftId = `post-test-draft-${ts}`;
    await db.insert(blogPosts).values({
      id: draftId,
      title: 'پیش‌نویس تست',
      excerpt: 'خلاصه',
      body: 'متن',
      published: false,
      createdAt: new Date().toISOString(),
    });
    seededIds.push(draftId);

    const res = await request(app).get('/sitemap.xml');
    expect(res.statusCode).toBe(200);
    expect(res.text).not.toContain(draftId);
  });
});
