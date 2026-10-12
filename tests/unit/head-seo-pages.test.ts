import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyPageSeo, resetHeadSeo, HOME_SEO } from "../../src/lib/headSeo";
import { applyCatalogSeo } from "../../src/lib/catalogSeo";
import { blogPostSeo, matchRoute, NOT_FOUND_SEO } from "../../src/lib/routeSeo";
import { createFakeDocument, installFakeDocument, addShellTag, type FakeDocument } from "./fake-document";

// Client head per route: a page without a canonical (404) must not inherit the previous
// page's canonical, and robots must follow the page.
let doc: FakeDocument;
let uninstall: () => void;

beforeEach(() => {
  doc = createFakeDocument();
  doc.title = HOME_SEO.title;
  addShellTag(doc, "meta", { name: "description", content: HOME_SEO.description });
  addShellTag(doc, "link", { rel: "canonical", href: HOME_SEO.canonical! });
  addShellTag(doc, "meta", { property: "og:url", content: HOME_SEO.canonical! });
  uninstall = installFakeDocument(doc);
});

afterEach(() => uninstall());

const content = (selector: string) => doc.head.querySelector(selector)?.getAttribute("content") ?? null;
const canonical = () => doc.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

describe("applyPageSeo", () => {
  it("a page with no canonical removes the previous canonical and og:url", () => {
    applyPageSeo(NOT_FOUND_SEO);
    expect(canonical()).toBeNull();
    expect(content('meta[property="og:url"]')).toBeNull();
    expect(content('meta[name="robots"]')).toBe("noindex, nofollow");
    expect(doc.title).toBe(NOT_FOUND_SEO.title);
  });

  it("robots defaults to index, follow when a page does not set it", () => {
    applyPageSeo({ title: "t", description: "d", canonical: "https://janebiarena.ir/about" });
    expect(content('meta[name="robots"]')).toBe("index, follow");
    expect(canonical()).toBe("https://janebiarena.ir/about");
  });

  it("the homepage reset restores its canonical after a 404", () => {
    applyPageSeo(NOT_FOUND_SEO);
    resetHeadSeo();
    expect(canonical()).toBe(HOME_SEO.canonical);
    expect(content('meta[property="og:url"]')).toBe(HOME_SEO.canonical);
    expect(content('meta[name="robots"]')).toBe("index, follow");
  });
});

describe("blog article head", () => {
  it("writes the article's own title, description and canonical, with og and twitter in step", () => {
    const seo = blogPostSeo({ id: "post-a", title: "عنوان نمونه", excerpt: "خلاصه" });
    applyPageSeo(seo);
    expect(doc.title).toBe("عنوان نمونه | مجله جانبی آرنا");
    expect(content('meta[property="og:title"]')).toBe(doc.title);
    expect(content('meta[name="twitter:title"]')).toBe(doc.title);
    expect(content('meta[property="og:type"]')).toBe("article");
    expect(canonical()).toBe("https://janebiarena.ir/blog/post-a");
  });
});

describe("catalogue robots", () => {
  it("a search result is noindex; the plain catalogue is indexable", () => {
    applyCatalogSeo({ itemCount: 3, category: null, brands: [], noindex: true });
    expect(content('meta[name="robots"]')).toBe("noindex, nofollow");
    applyCatalogSeo({ itemCount: 3, category: null, brands: [], noindex: false });
    expect(content('meta[name="robots"]')).toBe("index, follow");
  });
});

describe("every static route's registry head is applied as written", () => {
  it("applying a static route's head then leaving it returns the homepage head", () => {
    const about = matchRoute("/about");
    if (about.kind !== "static") throw new Error("about is static");
    applyPageSeo(about.seo);
    expect(doc.title).toBe(about.seo.title);
    expect(canonical()).toBe("https://janebiarena.ir/about");
    resetHeadSeo();
    expect(doc.title).toBe(HOME_SEO.title);
    expect(canonical()).toBe(HOME_SEO.canonical);
  });
});
