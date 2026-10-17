import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../server/db/index";
import { blogPosts, productFeatures, products } from "../../server/db/schema";
import {
  injectRootContent,
  pageSnapshotFor,
  renderBlogSnapshotHtml,
  renderProductSnapshotHtml,
} from "../../server/lib/pageSnapshot";

// Crawlers that run no JS must read the page text inside #root. Every value comes from
// the page's own DB row; nothing is invented and unknown rows yield no snapshot.

describe("renderProductSnapshotHtml", () => {
  const base = {
    id: 1, title: "کابل تست <b>", brand: "MCdodo", category: "کابل و سیم",
    price: 450000, stockQuantity: 3, description: null, warranty: null, features: [] as string[],
  };

  it("carries title, brand, category and price, with HTML escaped", () => {
    const html = renderProductSnapshotHtml(base);
    expect(html).toContain("<h1>کابل تست &lt;b&gt;</h1>");
    expect(html).toContain("MCdodo");
    expect(html).toContain("کابل و سیم");
    expect(html).toContain("۴۵۰,۰۰۰ تومان");
    expect(html).toContain("موجود");
  });

  it("marks zero stock as unavailable", () => {
    expect(renderProductSnapshotHtml({ ...base, stockQuantity: 0 })).toContain("ناموجود");
  });

  it("omits description, warranty and features when the row has none (no filler text)", () => {
    const html = renderProductSnapshotHtml(base);
    expect(html).not.toContain("گارانتی");
    expect(html).not.toContain("ویژگی‌ها");
    expect(html).not.toContain("<ul>");
  });

  it("renders description, warranty and non-empty features when present", () => {
    const html = renderProductSnapshotHtml({
      ...base, description: "توضیح واقعی", warranty: "۱۸ ماه", features: ["۱ متر", "  ", "۶۰ وات"],
    });
    expect(html).toContain("توضیح واقعی");
    expect(html).toContain("گارانتی: ۱۸ ماه");
    expect(html).toContain("<li>۱ متر</li>");
    expect(html).toContain("<li>۶۰ وات</li>");
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe("renderBlogSnapshotHtml", () => {
  it("splits the body on blank lines into paragraphs and escapes markup", () => {
    const html = renderBlogSnapshotHtml({
      id: "x", title: "عنوان", excerpt: "خلاصه", author: "تیم", category: "مقالات",
      body: "بند اول\n\nبند <script> دوم\n\n\nبند سوم",
    });
    expect(html).toContain("<h1>عنوان</h1>");
    expect(html).toContain("<p>بند اول</p>");
    expect(html).toContain("<p>بند &lt;script&gt; دوم</p>");
    expect(html).toContain("<p>بند سوم</p>");
    expect(html).not.toContain("<script>");
  });
});

describe("pageSnapshotFor", () => {
  it("returns null for routes it does not cover and for unknown rows", async () => {
    expect(await pageSnapshotFor("/")).toBeNull();
    expect(await pageSnapshotFor("/cart")).toBeNull();
    expect(await pageSnapshotFor("/products/99999999")).toBeNull();
    expect(await pageSnapshotFor("/blog/no-such-post-zzz")).toBeNull();
    expect(await pageSnapshotFor("/blog/%E0%A4%A")).toBeNull(); // malformed percent-encoding
  });

  it("builds a product snapshot from the DB row and its feature rows, on both URL spellings", async () => {
    await db.insert(products).values({
      id: 991201, title: "Snapshot probe", category: "test", price: 120000,
      image: "/products/x.svg", brand: "probe", stockQuantity: 2, description: "شرح آزمایشی",
    });
    await db.insert(productFeatures).values({ productId: 991201, feature: "ویژگی آزمایشی" });
    try {
      for (const path of ["/product/991201", "/products/991201", "/products/991201/"]) {
        const html = await pageSnapshotFor(path);
        expect(html).toContain("<h1>Snapshot probe</h1>");
        expect(html).toContain("شرح آزمایشی");
        expect(html).toContain("<li>ویژگی آزمایشی</li>");
        expect(html).toContain("۱۲۰,۰۰۰ تومان");
      }
    } finally {
      await db.delete(productFeatures).where(eq(productFeatures.productId, 991201));
      await db.delete(products).where(eq(products.id, 991201));
    }
  });

  it("builds a blog snapshot for a published post and none for a draft", async () => {
    const rows = [
      { id: "snap-pub", published: true },
      { id: "snap-draft", published: false },
    ];
    for (const r of rows) {
      await db.insert(blogPosts).values({
        id: r.id, title: `T ${r.id}`, excerpt: "e", body: "p1\n\np2", published: r.published,
        createdAt: new Date().toISOString(),
      });
    }
    try {
      expect(await pageSnapshotFor("/blog/snap-pub")).toContain("<p>p2</p>");
      expect(await pageSnapshotFor("/blog/snap-draft")).toBeNull();
    } finally {
      for (const r of rows) await db.delete(blogPosts).where(eq(blogPosts.id, r.id));
    }
  });
});

describe("injectRootContent", () => {
  it("fills the empty mount once and leaves the rest of the shell alone", () => {
    const shell = '<head></head><body><div id="root"></div><script></script></body>';
    const out = injectRootContent(shell, "<p>hi</p>");
    expect(out).toBe('<head></head><body><div id="root"><p>hi</p></div><script></script></body>');
  });

  it("is a no-op when the shell has no empty mount", () => {
    const shell = '<div id="root"><p>x</p></div>';
    expect(injectRootContent(shell, "<p>y</p>")).toBe(shell);
  });
});
