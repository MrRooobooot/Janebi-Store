import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
  injectNotFoundMetadata,
  injectSeoMetadata,
  routeMetaForRequest,
  SeoLookupUnavailable,
  unavailableFor,
} from "../../server/lib/seoMeta";
import { db } from "../../server/db/index";
import { blogPosts } from "../../server/db/schema";
import { matchRoute, NOT_FOUND_SEO, staticRoutePaths } from "../../src/lib/routeSeo";

// Server-rendered head for every public route, as the crawler receives it.
const SHELL = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf-8");

const tag = (html: string, attr: "name" | "property", key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];
const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];

describe("server head for every static route", () => {
  it.each(staticRoutePaths())("%s carries its registry title, canonical and robots", async (path) => {
    const meta = await routeMetaForRequest(path, new URLSearchParams());
    const seo = (matchRoute(path) as { seo: { title: string; canonical: string; robots: string } }).seo;
    expect(meta?.title).toBe(seo.title);
    expect(meta?.ogUrl).toBe(seo.canonical);
    expect(meta?.robots).toBe(seo.robots);

    const html = injectSeoMetadata(SHELL, meta!);
    expect(titleOf(html)).toBe(seo.title);
    expect(canonicalOf(html)).toBe(seo.canonical);
    expect(tag(html, "property", "og:title")).toBe(seo.title);
    expect(tag(html, "property", "og:url")).toBe(seo.canonical);
    expect(tag(html, "name", "twitter:title")).toBe(seo.title);
    expect(tag(html, "name", "robots")).toBe(seo.robots);
  });

  it("a non-home page never ships the homepage title in <title>", async () => {
    for (const path of staticRoutePaths().filter((p) => p !== "/")) {
      const meta = await routeMetaForRequest(path, new URLSearchParams());
      expect(meta?.title, path).not.toBe(titleOf(SHELL));
    }
  });
});

describe("404 head", () => {
  it("has the not-found title, noindex and no canonical or og:url", () => {
    const html = injectNotFoundMetadata(SHELL);
    expect(titleOf(html)).toBe(NOT_FOUND_SEO.title);
    expect(tag(html, "name", "robots")).toBe("noindex, nofollow");
    expect(canonicalOf(html)).toBeUndefined();
    expect(tag(html, "property", "og:url")).toBeUndefined();
    expect(html).not.toContain('rel="canonical"');
  });
});

describe("internal search results", () => {
  it("a catalogue search is noindex, while the plain catalogue is indexable", async () => {
    const plain = await routeMetaForRequest("/products", new URLSearchParams());
    const search = await routeMetaForRequest("/products", new URLSearchParams({ search: "کابل" }));
    expect(plain?.robots).toBe("index, follow");
    expect(search?.robots).toBe("noindex, nofollow");
  });
});

describe("blog articles", () => {
  const PUBLISHED = "route-seo-pages-published";
  const DRAFT = "route-seo-pages-draft";

  beforeAll(async () => {
    const row = { category: "مقالات", author: "تیم جانبی آرنا", createdAt: "2026-10-01T09:00:00.000Z", body: "متن" };
    await db.insert(blogPosts).values({ ...row, id: PUBLISHED, title: "مقاله‌ی منتشرشده", excerpt: "خلاصه‌ی مقاله", published: true });
    await db.insert(blogPosts).values({ ...row, id: DRAFT, title: "پیش‌نویس", excerpt: "پیش‌نویس", published: false });
  });

  afterAll(async () => {
    await db.delete(blogPosts).where(eq(blogPosts.id, PUBLISHED));
    await db.delete(blogPosts).where(eq(blogPosts.id, DRAFT));
  });

  it("a published article gets its own title, description and canonical", async () => {
    const meta = await routeMetaForRequest(`/blog/${PUBLISHED}`, new URLSearchParams());
    expect(meta?.title).toBe("مقاله‌ی منتشرشده | مجله جانبی آرنا");
    expect(meta?.description).toBe("خلاصه‌ی مقاله");
    expect(meta?.ogUrl).toBe(`https://janebiarena.ir/blog/${PUBLISHED}`);
    expect(meta?.ogType).toBe("article");
  });

  it("an unpublished or unknown article has no head of its own (the route answers 404)", async () => {
    expect(await routeMetaForRequest(`/blog/${DRAFT}`, new URLSearchParams())).toBeNull();
    expect(await routeMetaForRequest("/blog/no-such-post-xyz", new URLSearchParams())).toBeNull();
  });
});

describe("article lookup failure (database error, not a missing article)", () => {
  const PUBLISHED = "route-seo-pages-outage";
  const SECRET = "SQLITE_BUSY: database is locked (internal detail /srv/data/janebi.db)";

  beforeAll(async () => {
    const row = { category: "مقالات", author: "تیم جانبی آرنا", createdAt: "2026-10-01T09:00:00.000Z", body: "متن" };
    await db.insert(blogPosts).values({ ...row, id: PUBLISHED, title: "مقاله‌ی سالم", excerpt: "خلاصه", published: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await db.delete(blogPosts).where(eq(blogPosts.id, PUBLISHED));
  });

  it("a healthy read of the same published article still succeeds", async () => {
    const meta = await routeMetaForRequest(`/blog/${PUBLISHED}`, new URLSearchParams());
    expect(meta?.title).toBe("مقاله‌ی سالم | مجله جانبی آرنا");
  });

  it("a failed read rejects with SeoLookupUnavailable; it never resolves to null (which would be a 404)", async () => {
    // Local fixture: only this one query fails. The database itself is not touched.
    vi.spyOn(db.query.blogPosts, "findFirst").mockImplementationOnce(
      () => Promise.reject(new Error(SECRET)) as never
    );
    const attempt = routeMetaForRequest(`/blog/${PUBLISHED}`, new URLSearchParams());
    await expect(attempt).rejects.toBeInstanceOf(SeoLookupUnavailable);
  });

  it("the failure answers 503 with Retry-After and no-store, never 404 or 200", () => {
    const res = unavailableFor(new SeoLookupUnavailable(new Error(SECRET)), `/blog/${PUBLISHED}`);
    expect(res?.status).toBe(503);
    expect(res?.status).not.toBe(404);
    expect(res?.status).not.toBe(200);
    expect(res?.headers["Retry-After"]).toBe("60");
    expect(res?.headers["Cache-Control"]).toBe("no-store");
    expect(res?.headers["Content-Type"]).toContain("text/html");
  });

  it("the 503 response reveals no error text, SQL, path or stack", () => {
    const res = unavailableFor(new SeoLookupUnavailable(new Error(SECRET)), `/blog/${PUBLISHED}`);
    const everything = `${res?.body}\n${JSON.stringify(res?.headers)}`;
    expect(everything).not.toContain("SQLITE");
    expect(everything).not.toContain("janebi.db");
    expect(everything).not.toContain("/srv/");
    expect(everything).not.toContain("database is locked");
    expect(everything).not.toMatch(/\bat\s.+\(.+:\d+:\d+\)/);
    expect(res?.body).not.toMatch(/name="robots"/);
  });

  it("any failure on an article URL is 503; other routes keep their fallback (no 503)", () => {
    expect(unavailableFor(new Error("boom"), `/blog/${PUBLISHED}`)?.status).toBe(503);
    expect(unavailableFor(new Error("boom"), "/about")).toBeNull();
    expect(unavailableFor(new Error("boom"), "/products/12")).toBeNull();
  });

  it("an unknown article is still a 404 (null), not a 503", async () => {
    expect(await routeMetaForRequest("/blog/no-such-post-outage", new URLSearchParams())).toBeNull();
  });
});
