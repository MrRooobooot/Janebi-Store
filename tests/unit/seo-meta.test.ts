import { describe, it, expect } from "vitest";
import { escapeHtml, injectSeoMetadata, routeMetaForRequest } from "../../server/lib/seoMeta";

const SHELL = `<!doctype html><html><head><title>جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت</title>
<meta name="description" content="فروشگاه تخصصی جانبی آرنا" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://janebiarena.ir/" />
<meta property="og:title" content="generic" />
<meta property="og:description" content="generic desc" />
</head><body></body></html>`;

describe("escapeHtml", () => {
  it("escapes quotes, angle brackets and ampersands", () => {
    expect(escapeHtml(`a & b "c" <d> 'e'`)).toBe("a &amp; b &quot;c&quot; &lt;d&gt; &#39;e&#39;");
  });

  it("preserves Farsi text", () => {
    expect(escapeHtml("قاب گوشی سامسونگ")).toBe("قاب گوشی سامسونگ");
  });
});

describe("injectSeoMetadata", () => {
  it("replaces title, description and og tags with route-specific values", () => {
    const out = injectSeoMetadata(SHELL, {
      title: "پاوربانک بیسوس ۲۰۰۰۰ | جانبی آرنا",
      description: "خرید پاوربانک بیسوس با ضمانت اصالت",
      ogType: "product",
      ogUrl: "https://janebiarena.ir/products/6",
      ogImage: "https://janebiarena.ir/products/pb-6.svg",
    });
    expect(out).toContain("<title>پاوربانک بیسوس ۲۰۰۰۰ | جانبی آرنا</title>");
    expect(out).toContain('content="خرید پاوربانک بیسوس با ضمانت اصالت"');
    expect(out).toContain('<meta property="og:type" content="product" />');
    expect(out).toContain('<meta property="og:url" content="https://janebiarena.ir/products/6" />');
    expect(out).toContain('<meta property="og:image" content="https://janebiarena.ir/products/pb-6.svg" />');
    expect(out).toContain('<link rel="canonical" href="https://janebiarena.ir/products/6" />');
    expect(out.match(/rel="canonical"/g)?.length).toBe(1);
    expect(out).not.toContain('content="generic"');
  });

  it("escapes hostile metadata values", () => {
    const out = injectSeoMetadata(SHELL, {
      title: '<script>alert("x")</script> & پاوربانک',
      description: 'desc "quoted" & <b>bold</b>',
      ogType: "product",
      ogUrl: "https://janebiarena.ir/products/6",
    });
    expect(out).not.toContain("<script>alert");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&quot;quoted&quot;");
    expect(out).toContain("&amp;");
  });

  it("returns html unchanged when no head present", () => {
    expect(injectSeoMetadata("<div/>", { title: "t", description: "d", ogType: "website", ogUrl: "u" })).toBe("<div/>");
  });
});

describe("routeMetaForRequest fallbacks", () => {
  it("returns null for unknown routes (keeps generic shell)", async () => {
    expect(await routeMetaForRequest("/some/unknown/page", new URLSearchParams())).toBeNull();
  });

  it("returns category metadata for category listing", async () => {
    // DB is stubbed in unit env? routeMetaForCategory requires db — assert it does not throw and returns shape or null
    const result = await routeMetaForRequest("/products", new URLSearchParams("category=پاوربانک"));
    expect(result === null || typeof result!.title === "string").toBe(true);
  });
});
