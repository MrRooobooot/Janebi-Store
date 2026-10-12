import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { injectSeoMetadata, productOgImageFor, routeMetaForRequest } from "../../server/lib/seoMeta";
import { productJsonLdFor } from "../../server/lib/breadcrumbs";
import { db } from "../../server/db/index";
import { products } from "../../server/db/schema";
import { CATALOG_HUB_DESCRIPTION, CATALOG_HUB_TITLE } from "../../src/lib/catalogCopy";
import { normalizeDescription, productSeo, productSocialImage, SHARE_IMAGE } from "../../src/lib/productSeo";
import { HOME_SEO } from "../../src/lib/headSeo";

// Server metadata for every route the client also writes: Twitter tags must
// follow the route (never the homepage copy), and the product head and JSON-LD
// must describe the same product.
const SHELL = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf-8");

const metaContent = (html: string, attr: "name" | "property", key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];

async function headFor(path: string, query = new URLSearchParams()) {
  const pathname = path.split("?")[0];
  const meta = await routeMetaForRequest(pathname, query);
  if (!meta) return null;
  const image = await productOgImageFor(pathname);
  return injectSeoMetadata(SHELL, image ? { ...meta, ogImage: image.og, preloadImage: image.hero } : meta);
}

describe("twitter cards follow the route", () => {
  it("catalogue hub: twitter title and description match og, not the homepage", async () => {
    const html = await headFor("/products");
    expect(html).not.toBeNull();
    expect(metaContent(html!, "name", "twitter:title")).toBe(CATALOG_HUB_TITLE);
    expect(metaContent(html!, "name", "twitter:description")).toBe(CATALOG_HUB_DESCRIPTION);
    expect(metaContent(html!, "name", "twitter:title")).toBe(metaContent(html!, "property", "og:title"));
    expect(metaContent(html!, "name", "twitter:image")).toBe(SHARE_IMAGE);
  });

  it("homepage shell keeps its own twitter copy (not re-written by the injector)", () => {
    expect(metaContent(SHELL, "name", "twitter:title")).toBe(HOME_SEO.twitterTitle);
    expect(metaContent(SHELL, "name", "twitter:description")).toBe(HOME_SEO.twitterDescription);
  });

  it("category listing: twitter title is the filtered title", async () => {
    const cat = "دستهٔ آزمون توییتر";
    await db.insert(products).values({
      id: 991301, title: "twitter probe", category: cat, price: 1000,
      image: "/images/products/p-14.jpg", brand: "probe", stockQuantity: 1,
    });
    try {
      const html = await headFor("/products", new URLSearchParams({ category: cat }));
      expect(metaContent(html!, "name", "twitter:title")).toBe(`خرید ${cat} | جانبی آرنا`);
    } finally {
      await db.delete(products).where(eq(products.id, 991301));
    }
  });
});

describe("product page head", () => {
  const withImage = 991311;
  const svgOnly = 991312;

  it("uses the same title, description, canonical and social image as the client", async () => {
    await db.insert(products).values({
      id: withImage, title: "هدست آزمایشی", description: "توضیح <b>کامل</b> محصول", category: "test",
      price: 1000, image: "/images/products/p-14.jpg", brand: "probe", stockQuantity: 1,
    });
    try {
      const html = await headFor(`/products/${withImage}`);
      const expected = productSeo({
        id: withImage, title: "هدست آزمایشی", description: "توضیح <b>کامل</b> محصول", image: "/images/products/p-14.jpg",
      });
      expect(html).toContain(`<title>${expected.title}</title>`);
      expect(metaContent(html!, "name", "description")).toBe(expected.description);
      expect(html).toContain(`<link rel="canonical" href="${expected.canonical}" />`);
      expect(metaContent(html!, "property", "og:type")).toBe("product");
      expect(metaContent(html!, "name", "twitter:title")).toBe(expected.title);
      expect(metaContent(html!, "name", "twitter:image")).toBe("https://janebiarena.ir/images/products/p-14.jpg");
      expect(metaContent(html!, "property", "og:image")).toBe("https://janebiarena.ir/images/products/p-14.jpg");
    } finally {
      await db.delete(products).where(eq(products.id, withImage));
    }
  });

  it("SVG product art: the social card falls back to the raster share card", async () => {
    await db.insert(products).values({
      id: svgOnly, title: "قاب آزمایشی", description: null, category: "test",
      price: 1000, image: "/products/cpr-14.svg", brand: "probe", stockQuantity: 1,
    });
    try {
      const html = await headFor(`/products/${svgOnly}`);
      expect(metaContent(html!, "name", "twitter:image")).toBe(SHARE_IMAGE);
      expect(metaContent(html!, "property", "og:image")).toBe(SHARE_IMAGE);
    } finally {
      await db.delete(products).where(eq(products.id, svgOnly));
    }
  });

  it("product JSON-LD names the product and points offers at the canonical URL", async () => {
    await db.insert(products).values({
      id: withImage, title: "هدست JSON", description: "توضیح", category: "test",
      price: 250000, image: "/images/products/p-14.jpg", brand: "probe", stockQuantity: 3,
    });
    try {
      const block = await productJsonLdFor(`/product/${withImage}`);
      expect(block).toContain(`<link rel="canonical" href="https://janebiarena.ir/products/${withImage}" />`);
      const ld = JSON.parse(block!.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
      expect(ld["@type"]).toBe("Product");
      expect(ld.name).toBe("هدست JSON");
      expect(ld.offers.url).toBe(`https://janebiarena.ir/products/${withImage}`);
      expect(ld.offers.price).toBe("250000");
    } finally {
      await db.delete(products).where(eq(products.id, withImage));
    }
  });
});

describe("shared product SEO helpers", () => {
  it("product fallback description states no guarantee or price claim", () => {
    const seo = productSeo({ id: 1, title: "کابل نمونه", description: null, image: null });
    expect(seo.description).toBe("خرید کابل نمونه از جانبی آرنا؛ قیمت و موجودی به‌روز.");
    expect(seo.description).not.toContain("ضمانت");
    expect(seo.description).not.toContain("بهترین قیمت");
  });

  it("social image: absolute for raster, share card for SVG, undefined when absent", () => {
    expect(productSocialImage("/images/products/a.jpg")).toBe("https://janebiarena.ir/images/products/a.jpg");
    expect(productSocialImage("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(productSocialImage("/products/a.svg")).toBe(SHARE_IMAGE);
    expect(productSocialImage("/products/a.svg?v=2")).toBe(SHARE_IMAGE);
    expect(productSocialImage(null)).toBeUndefined();
  });

  it("normalizeDescription strips tags, collapses spaces and caps the length", () => {
    expect(normalizeDescription("<p>سلام   <b>دنیا</b></p>", "x")).toBe("سلام دنیا");
    expect(normalizeDescription("", "fallback")).toBe("fallback");
    const long = normalizeDescription("ا".repeat(400), "x");
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith("…")).toBe(true);
  });
});
