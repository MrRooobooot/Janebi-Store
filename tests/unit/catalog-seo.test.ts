import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { injectSeoMetadata, routeMetaForRequest } from "../../server/lib/seoMeta";
import { catalogSnapshotFor } from "../../server/lib/catalogSnapshot";
import { db } from "../../server/db/index";
import { products } from "../../server/db/schema";
import { CATALOG_HUB_DESCRIPTION } from "../../src/lib/catalogCopy";

// Regression guard: /products (the unfiltered catalogue hub) must not reuse the
// homepage <title>/og:title, and the homepage itself must keep its own metadata.
const SHELL = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf-8");
const HOME_TITLE = "جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت";
const HOME_OG_TITLE = "جانبی آرنا | خرید آنلاین لوازم جانبی موبایل با ضمانت اصالت";
const CATALOG_HUB_TITLE_EXPECTED = "همه محصولات لوازم جانبی | جانبی آرنا";

const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];
const metaOf = (html: string, attr: string, key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const canonicalCount = (html: string) => html.match(/rel="canonical"/g)?.length ?? 0;

describe("homepage metadata is untouched", () => {
  it("shell <title> and og:title are the homepage copy", () => {
    expect(titleOf(SHELL)).toBe(HOME_TITLE);
    expect(metaOf(SHELL, "property", "og:title")).toBe(HOME_OG_TITLE);
  });

  it("routeMetaForRequest('/') carries the homepage head, equal to the shell's values", async () => {
    const meta = await routeMetaForRequest("/", new URLSearchParams());
    expect(meta?.title).toBe(HOME_TITLE);
    expect(meta?.ogUrl).toBe("https://janebiarena.ir/");
    expect(meta?.robots).toBe("index, follow");
  });
});

describe("/products hub metadata", () => {
  it("has a dedicated title that differs from the homepage title", async () => {
    const meta = await routeMetaForRequest("/products", new URLSearchParams());
    expect(meta?.title).toBe(CATALOG_HUB_TITLE_EXPECTED);
    expect(meta?.title).not.toBe(HOME_TITLE);
  });

  it("SSR head: <title> and og:title carry the same catalogue title", async () => {
    const meta = await routeMetaForRequest("/products", new URLSearchParams());
    const html = injectSeoMetadata(SHELL, meta!);
    expect(titleOf(html)).toBe(CATALOG_HUB_TITLE_EXPECTED);
    expect(metaOf(html, "property", "og:title")).toBe(CATALOG_HUB_TITLE_EXPECTED);
    expect(metaOf(html, "property", "og:title")).not.toBe(HOME_TITLE);
    expect(metaOf(html, "property", "og:title")).not.toBe(HOME_OG_TITLE);
  });

  it("keeps a single canonical and og:url pointing at /products", async () => {
    const meta = await routeMetaForRequest("/products", new URLSearchParams());
    const html = injectSeoMetadata(SHELL, meta!);
    expect(canonicalCount(html)).toBe(1);
    expect(html).toContain('<link rel="canonical" href="https://janebiarena.ir/products" />');
    expect(metaOf(html, "property", "og:url")).toBe("https://janebiarena.ir/products");
  });

  it("keeps the meta description", async () => {
    const meta = await routeMetaForRequest("/products", new URLSearchParams());
    const html = injectSeoMetadata(SHELL, meta!);
    expect(metaOf(html, "name", "description")).toBe(CATALOG_HUB_DESCRIPTION);
  });

  it("keeps the shell's Organization and WebSite JSON-LD", async () => {
    const meta = await routeMetaForRequest("/products", new URLSearchParams());
    const html = injectSeoMetadata(SHELL, meta!);
    expect(html).toContain('"@type": "Organization"');
    expect(html).toContain('"@type": "WebSite"');
  });

  it("prerender CollectionPage JSON-LD is named with the same catalogue title", async () => {
    const snapshot = await catalogSnapshotFor("/products", new URLSearchParams());
    expect(snapshot).not.toBeNull();
    expect(snapshot!.title).toBe(CATALOG_HUB_TITLE_EXPECTED);
    const block = snapshot!.jsonLd.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? "";
    const ld = JSON.parse(block);
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.name).toBe(CATALOG_HUB_TITLE_EXPECTED);
    expect(ld.url).toBe("https://janebiarena.ir/products");
  });

  it("a filtered category listing keeps its own title", async () => {
    const cat = "دستهٔ آزمون عنوان سئو";
    await db.insert(products).values({
      id: 991101, title: "SEO hub probe", category: cat, price: 1000,
      image: "/products/cpr-hub.svg", brand: "probe", stockQuantity: 1,
    });
    try {
      const meta = await routeMetaForRequest("/products", new URLSearchParams({ category: cat }));
      expect(meta?.title).toBe(`خرید ${cat} | جانبی آرنا`);
    } finally {
      await db.delete(products).where(eq(products.id, 991101));
    }
  });
});

describe("product detail metadata is untouched", () => {
  it("/product/:id and /products/:id keep the product title, description and canonical", async () => {
    await db.insert(products).values({
      id: 991102, title: "SEO title probe", description: "توضیح آزمایشی محصول", category: "test",
      price: 1000, image: "/products/cpr-pdp.svg", brand: "probe", stockQuantity: 1,
    });
    try {
      for (const path of ["/product/991102", "/products/991102"]) {
        const meta = await routeMetaForRequest(path, new URLSearchParams());
        expect(meta?.title).toBe("SEO title probe | جانبی آرنا");
        expect(meta?.description).toBe("توضیح آزمایشی محصول");
        expect(meta?.ogUrl).toBe("https://janebiarena.ir/products/991102");
      }
    } finally {
      await db.delete(products).where(eq(products.id, 991102));
    }
  });
});
