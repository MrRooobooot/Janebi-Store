import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  HOME_SEO,
  matchRoute,
  NOT_FOUND_SEO,
  normalizePath,
  staticRoutePaths,
  blogPostSeo,
} from "../../src/lib/routeSeo";
import { catalogDescription, CATALOG_HUB_DESCRIPTION, CATALOG_HUB_TITLE } from "../../src/lib/catalogCopy";
import { productSeo } from "../../src/lib/productSeo";
import { shouldNoIndex } from "../../server/lib/robots";

// The registry is the single source of route metadata. These tests keep it in step
// with the real routes (App.tsx), the server's noindex rule, and the commercial-copy
// rule (only claims the store's own FAQ, About or Terms page states).
const APP_TSX = readFileSync(fileURLToPath(new URL("../../src/App.tsx", import.meta.url)), "utf-8");
const INDEX_HTML = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf-8");
const SITE = "https://janebiarena.ir";

/** Every concrete path App.tsx declares (params replaced by a sample value). */
function appRoutePaths(): string[] {
  const out: string[] = ["/"];
  let inAdmin = false;
  for (const m of APP_TSX.matchAll(/path="([^"]+)"/g)) {
    const p = m[1];
    if (p === "*") continue;
    if (p === "/admin") {
      inAdmin = true;
      continue;
    }
    if (p === "/") continue;
    const absolute = p.startsWith("/") ? p : inAdmin ? `/admin/${p}` : `/${p}`;
    out.push(absolute.replace(":id", "1").replace(":slug", "sample-post"));
  }
  return out;
}

describe("route coverage", () => {
  it("every route App.tsx declares is known to the registry", () => {
    const paths = appRoutePaths();
    expect(paths.length).toBeGreaterThan(20);
    for (const p of paths) {
      expect(matchRoute(p).kind, `route ${p}`).not.toBe("notFound");
    }
  });

  it("the server's SPA list and the registry agree on what is a 404", () => {
    for (const p of ["/nonexistent-page-xyz", "/themes", "/wp-admin", "/admin/unknown-tool", "/products/abc"]) {
      expect(matchRoute(p).kind, p).toBe("notFound");
    }
  });
});

describe("path normalisation and matching", () => {
  it("strips a trailing slash and the query string", () => {
    expect(normalizePath("/cart/")).toBe("/cart");
    expect(normalizePath("/cart?x=1")).toBe("/cart");
    expect(normalizePath("/")).toBe("/");
  });

  it("product URLs match in both the singular and plural form", () => {
    expect(matchRoute("/product/12")).toEqual({ kind: "product", id: "12" });
    expect(matchRoute("/products/12/")).toEqual({ kind: "product", id: "12" });
  });

  it("catalogue, blog listing and blog article resolve to their owners", () => {
    expect(matchRoute("/products?category=x").kind).toBe("catalog");
    expect(matchRoute("/products/").kind).toBe("catalog");
    expect(matchRoute("/blog").kind).toBe("static");
    expect(matchRoute("/blog/post-a")).toEqual({ kind: "blogPost", slug: "post-a" });
    expect(matchRoute("/blog/%D9%85%D9%82%D8%A7%D9%84%D9%87").kind).toBe("blogPost");
  });

  it("admin sub-routes are known only when App.tsx declares them", () => {
    expect(matchRoute("/admin/blog").kind).toBe("admin");
    expect(matchRoute("/admin/audit-logs").kind).toBe("admin");
    expect(matchRoute("/admin/xyz").kind).toBe("notFound");
  });
});

describe("registry metadata", () => {
  const paths = staticRoutePaths();

  it("every static page has a title, a description and its own absolute canonical", () => {
    for (const p of paths) {
      const seo = matchRoute(p);
      if (seo.kind !== "static") throw new Error(`${p} is not static`);
      expect(seo.seo.title.length, `title ${p}`).toBeGreaterThan(5);
      expect(seo.seo.description.length, `description ${p}`).toBeGreaterThan(30);
      expect(seo.seo.description.length, `description length ${p}`).toBeLessThanOrEqual(160);
      expect(seo.seo.canonical, `canonical ${p}`).toBe(p === "/" ? `${SITE}/` : `${SITE}${p}`);
    }
  });

  it("static titles are distinct, so no two pages share a head", () => {
    const titles = paths.map((p) => (matchRoute(p) as { seo: { title: string } }).seo.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("noindex in the registry matches the server's noindex rule for every static and admin path", () => {
    for (const p of [...paths, "/admin", "/admin/products"]) {
      const m = matchRoute(p) as { seo: { robots?: string } };
      const registryNoindex = m.seo.robots === "noindex, nofollow";
      expect(registryNoindex, `robots for ${p}`).toBe(shouldNoIndex(p));
    }
  });

  it("the 404 head is noindex and has no canonical", () => {
    expect(NOT_FOUND_SEO.robots).toBe("noindex, nofollow");
    expect(NOT_FOUND_SEO.canonical).toBeUndefined();
    expect(NOT_FOUND_SEO.title).toBe("صفحه پیدا نشد | جانبی آرنا");
  });

  it("blog article metadata uses the post's own title, excerpt and canonical", () => {
    const seo = blogPostSeo({ id: "post-a", title: "عنوان نمونه", excerpt: "<p>خلاصه  نمونه</p>" });
    expect(seo.title).toBe("عنوان نمونه | مجله جانبی آرنا");
    expect(seo.description).toBe("خلاصه نمونه");
    expect(seo.canonical).toBe(`${SITE}/blog/post-a`);
    expect(seo.ogType).toBe("article");
  });
});

describe("homepage and catalogue copy", () => {
  it("HOME_SEO agrees with index.html for the description and social tags", () => {
    expect(INDEX_HTML).toContain(`content="${HOME_SEO.description}"`);
    expect(INDEX_HTML).toContain(`content="${HOME_SEO.ogDescription}"`);
    expect(INDEX_HTML).toContain(`content="${HOME_SEO.twitterDescription}"`);
  });

  it("catalogue descriptions carry the live count only on filtered listings", () => {
    expect(catalogDescription({ category: null, brands: [] }, 99)).toBe(CATALOG_HUB_DESCRIPTION);
    expect(catalogDescription({ category: "کابل و سیم", brands: [] }, 7)).toContain("۷ محصول");
    expect(CATALOG_HUB_TITLE).not.toBe(HOME_SEO.title);
  });
});

describe("commercial copy (no unbacked promise)", () => {
  // Phrases that were not stated by the store's own FAQ, About or Terms page, or that
  // are price/quality superlatives. Keep this list in step with docs/reference/seo-claims.md.
  const FORBIDDEN = [
    "بهترین قیمت",
    "تضمین کیفیت",
    "ارسال سریع",
    "گارانتی تعویض فیزیکی",
    "گارانتی معتبر",
    "گارانتی اصالت",
    "اورجینال",
    "مرجع تخصصی",
    "نشکن",
  ];

  function metadataTexts(): string[] {
    const texts: string[] = [INDEX_HTML];
    for (const p of staticRoutePaths()) {
      const m = matchRoute(p) as { seo: { title: string; description: string; ogDescription?: string; twitterDescription?: string } };
      texts.push(m.seo.title, m.seo.description, m.seo.ogDescription ?? "", m.seo.twitterDescription ?? "");
    }
    texts.push(NOT_FOUND_SEO.description, blogPostSeo({ id: "x", title: "t", excerpt: null }).description);
    texts.push(catalogDescription({ category: "کابل و سیم", brands: [] }, 3), CATALOG_HUB_DESCRIPTION);
    texts.push(productSeo({ id: 1, title: "نمونه", description: null }).description);
    return texts;
  }

  it("no metadata text uses a superlative or a claim without documentation", () => {
    const joined = metadataTexts().join("\n");
    for (const phrase of FORBIDDEN) {
      expect(joined.includes(phrase), `forbidden phrase: ${phrase}`).toBe(false);
    }
  });
});

describe("contact metadata names only channels the page shows", () => {
  const CONTACT_SOURCE = readFileSync(
    fileURLToPath(new URL("../../src/pages/static/Contact.tsx", import.meta.url)),
    "utf-8"
  );
  // Messaging channels that the metadata must not name unless the Contact page source shows them.
  const CHANNEL_WORDS = [
    "واتساپ", "واتس‌اپ", "واتس اپ", "اینستاگرام", "تلگرام",
    "whatsapp", "instagram", "telegram",
  ];

  it("the /contact description mentions no channel that the page does not show", () => {
    const description = (matchRoute("/contact") as { seo: { description: string } }).seo.description;
    for (const word of CHANNEL_WORDS) {
      if (description.toLowerCase().includes(word.toLowerCase())) {
        expect(CONTACT_SOURCE.toLowerCase().includes(word.toLowerCase()), `channel not on the page: ${word}`).toBe(true);
      }
    }
    for (const word of CHANNEL_WORDS) expect(description.includes(word), `channel in metadata: ${word}`).toBe(false);
  });

  it("the phone, email and contact form named in the description are on the page", () => {
    const description = (matchRoute("/contact") as { seo: { description: string } }).seo.description;
    expect(description).toContain("تلفن پشتیبانی");
    expect(description).toContain("پست الکترونیک");
    expect(description).toContain("فرم ارسال پیام");
    expect(CONTACT_SOURCE).toContain("تلفن پشتیبانی");
    expect(CONTACT_SOURCE).toContain("پست الکترونیک");
    expect(CONTACT_SOURCE).toContain("ارسال پیام مستقیم به پشتیبانی");
  });
});

describe("offers metadata makes no discount promise without data", () => {
  // Wording that promises a live discount, a limited offer or a price or saving. The
  // offers page can be empty ("محصول تخفیف‌داری موجود نیست"), so none of it belongs in metadata.
  const UNEVIDENCED_OFFER_PROMISES = [
    "تخفیف‌های جاری", "تخفیف‌های فعلی", "محدود", "بالاترین میزان تخفیف", "صرفه‌جویی",
    "قیمت ویژه", "فقط امروز", "تا پایان", "پیشنهادهای ویژه", "تخفیف ویژه",
  ];

  it("the /offers title and description carry no unevidenced promise", () => {
    const seo = (matchRoute("/offers") as { seo: { title: string; description: string } }).seo;
    for (const phrase of UNEVIDENCED_OFFER_PROMISES) {
      expect(seo.title.includes(phrase), `title promises: ${phrase}`).toBe(false);
      expect(seo.description.includes(phrase), `description promises: ${phrase}`).toBe(false);
    }
  });

  it("the /offers metadata states no figure, percentage or time window", () => {
    const seo = (matchRoute("/offers") as { seo: { title: string; description: string } }).seo;
    const text = `${seo.title} ${seo.description}`;
    expect(/[0-9۰-۹%٪]/.test(text), text).toBe(false);
  });
});
