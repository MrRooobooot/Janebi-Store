# SEO copy: commercial claims register

> **Status:** living · **Updated:** 2026-10-12 · **Scope:** register of commercial claims that reach search engines and social cards

> Last reviewed: 2026-10-13. Scope: text that reaches search engines and social cards
> (`<title>`, meta description, Open Graph, Twitter, JSON-LD descriptions). Page
> content outside that scope is listed at the end, not rewritten.

## Rule

A commercial promise stays in SEO copy only when the store's own published page states
it. Price and quality superlatives are never used, whatever the source. Product data
(warranty, price, stock) is emitted only from the product row.

## Sources the store publishes

| Claim | Source in the repo | Status |
|---|---|---|
| Authenticity guarantee («ضمانت اصالت») | `src/components/FAQ.tsx`: «آیا محصولات سایت اصل هستند؟» answer; `src/pages/static/About.tsx` heading «تضمین ۱۰۰٪ اصالت» | Stated by the store. Kept in metadata. |
| 7-day return window | `src/components/FAQ.tsx`: return question | Stated. Not used in metadata. |
| Warranty («گارانتی تعویض») | `src/pages/static/About.tsx`: «با گارانتی تعویض اصلی» | Stated, but the wording is loose. Not used in metadata. |
| Delivery across Iran | `src/pages/static/Terms.tsx`: delivery paragraph (Tehran courier, provinces by post) | Stated in the legal page. Kept as «ارسال به سراسر ایران». |
| Online payment | Gateway integration (`server/services`) | Factual. Kept as «پرداخت آنلاین». |

Note: `src/pages/static/Terms.tsx` (the legal page) does not define what the authenticity
guarantee covers. The owner should confirm it before the guarantee is used in legal or
marketing text.

## Changes made in SEO copy (2026-10-12)

| Where | Before | After | Reason |
|---|---|---|---|
| Homepage description (`index.html`, `HOME_SEO`) | «با تضمین کیفیت، بهترین قیمت و ارسال سریع» | «با ضمانت اصالت و ارسال به سراسر ایران» | «بهترین قیمت» and «تضمین کیفیت» are unbacked superlatives; «ارسال سریع» has no documented speed |
| Homepage description | «گلس نشکن» | «گلس محافظ» | «نشکن» is a durability claim about a product |
| Homepage og and twitter description | «مرجع تخصصی …»، «گارانتی معتبر»، «گارانتی تعویض و ارسال سریع» | «خرید لوازم جانبی اصل …با ضمانت اصالت»، «… با ضمانت اصالت و ارسال به سراسر ایران» | «مرجع» is a self-ranking; «گارانتی معتبر» names no terms |
| Homepage Organization JSON-LD (`index.html`) | «مرجع تخصصی …ارسال سریع» | «فروشگاه تخصصی … ارسال به سراسر کشور» | same as above |
| Catalogue (filtered) description | «… اورجینال … ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع» | «… با قیمت و موجودی به‌روز، همراه با ضمانت اصالت و ارسال به سراسر ایران» | «گارانتی تعویض فیزیکی» is not stated anywhere; «اورجینال» repeats the authenticity claim |
| Catalogue hub description | (was the homepage text) | «کاتالوگ کامل لوازم جانبی موبایل …: جست‌وجو و فیلتر …، با قیمت و موجودی به‌روز» | describes what the page does |
| Product description fallback | «با بهترین قیمت و ضمانت اصالت» | «خرید X از جانبی آرنا؛ قیمت و موجودی به‌روز.» | «بهترین قیمت» is a superlative; the guarantee is not product-specific |
| Catalogue page header (visible, `src/pages/Products.tsx`) | «محصول اورجینال … با ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع»؛ «… با گارانتی تعویض فیزیکی» | «محصول … با قیمت و موجودی به‌روز و ضمانت اصالت»؛ «جست‌وجو و مقایسه‌ی …، با قیمت و موجودی به‌روز» | same claims as the metadata, visible on the same page |
| Product trust badge (`src/pages/ProductDetail.tsx`) | «ارسال سریع» | «ارسال به سراسر ایران» | no documented speed; the documented scope is national |
| Static pages (`src/lib/routeSeo.ts`) | «ارسال سریع»، «پاسخ‌گویی سریع»، «گارانتی اصالت»، «پرداخت امن»، «اورجینال»، «افتخارات»، «مرکز خرید …» with a brand list | «ارسال …»، «پاسخ‌گویی …»، «ضمانت اصالت»، «پرداخت آنلاین»، «با ضمانت اصالت کالا» | removed unbacked speed, safety and brand-list claims; «ضمانت اصالت» is the stated wording |
| `/contact` description (phase 4) | «شماره تماس، واتساپ، اینستاگرام، تلگرام و ایمیل پشتیبانی …» | «تلفن پشتیبانی، پست الکترونیک و فرم ارسال پیام جانبی آرنا؛ …» | WhatsApp, Instagram and Telegram appear nowhere in `src/` (`Contact.tsx` and `Footer.tsx` show the phone number, the email address and the form). Metadata names only what the page shows. |
| `/offers` title and description (phase 4) | «پیشنهادهای ویژه و محدود»، «تخفیف‌های جاری … با قیمت و موجودی به‌روز» | «پیشنهادهای جانبی آرنا | محصولات دارای تخفیف»، «بخش پیشنهادهای جانبی آرنا برای مرور محصولات دارای تخفیف …» | «محدود» and «تخفیف‌های جاری» promised a live, limited discount. The page itself says «در حال حاضر محصول تخفیف‌داری موجود نیست» when no product is discounted. The new text makes no promise about discounts that may not exist. |

## Correction: delivery speed (phase 4)

The first version of this register said «ارسال سریع» had no documented speed. That was
wrong. `src/pages/static/Terms.tsx` states that orders in Tehran are delivered in under 24
hours, and orders elsewhere in Iran in 2 to 3 working days. The store does state a timing,
so the removal of «ارسال سریع» was a choice of wording, not a missing source. Metadata
still says only «ارسال به سراسر ایران», which Terms supports. No timing claim was added to
metadata. A future metadata line about speed must quote the Terms wording.

## Enforced by tests

`tests/unit/route-registry.test.ts` fails if any metadata text (registry, catalogue
copy, product fallback, index.html) contains one of: «بهترین قیمت»، «تضمین کیفیت»،
«ارسال سریع»، «گارانتی تعویض فیزیکی»، «گارانتی معتبر»، «گارانتی اصالت»، «اورجینال»،
«مرجع تخصصی»، «نشکن». Adding a new claim to metadata means adding it to the table above
with its source first.

Two more guards in the same file (phase 4):

- `/contact` metadata: a messaging channel (WhatsApp, Instagram, Telegram and their Persian and English spellings) is allowed only if `src/pages/static/Contact.tsx` contains it.
- `/offers` metadata: no discount, limit or saving promise («تخفیف‌های جاری»، «محدود»، «بالاترین میزان تخفیف»، «صرفه‌جویی»، «قیمت ویژه»، «فقط امروز»، «تا پایان»، «پیشنهادهای ویژه»، «تخفیف ویژه») and no digit, percentage or time window.

These guards check listed phrases only. They do not prove a claim is true. The claims below
are not decided by the code and stay open until the owner decides them.

## Owner decisions (open, not changed in phases 1–4)

The owner must confirm or correct each item. Only the wording changes listed above are
made without the owner; the items below are the owner's to decide.

| Where | Claim | Why it needs the owner |
|---|---|---|
| `FAQ.tsx:19`, `Footer.tsx:48`, `Brands.tsx` | «ضمانت اصالت و سلامت فیزیکی» (all products) | The owner confirmed the authenticity guarantee with physical testing on 2026-10-13. Still open: `Terms.tsx` does not define what the guarantee covers; a legal scope is needed. |
| `Terms.tsx:20` | the introduction promises «شرایط گارانتی» | The body of Terms has no warranty section. Legal text. |
| `About.tsx:20، 60، 62` and `Offers.tsx:34` | «بهترین کیفیت»، «مناسب‌ترین قیمت»، «بهترین قیمت بازار»، «بالاترین کیفیت با قیمتی رقابتی»، «بالاترین میزان تخفیف» | Superlatives with no source; the register forbids them. Removing them changes visible copy, so the owner approves. |
| `About.tsx:32، 79، 85` | «تمامی محصولات … گارانتی تعویض اصلی»، «تمام کالاهای وارداتی … تست سنجش کیفیت»، «مهلت بازگشت ۷ روزه واقعی» | `FAQ.tsx:15` makes the return window conditional. The quality-test process has no source. |
| `About.tsx:50` در برابر `constants.ts:42`، `Contact.tsx:57` | «پشتیبانی ۲۴/۷» | The default support hours are «همه روزه از ساعت ۹:۰۰ الی ۲۱:۰۰». The two cannot both be true. The owner states the real hours. |
| `About.tsx:62`، `Footer.tsx:48`، `/about` metadata | «واردات مستقیم بدون واسطه»، «عرضه‌ی مستقیم» | A business fact about sourcing. The only source is About itself. |
| `Brands.tsx:80، 84، 87، 233` | «۱۰۰٪ محصولات اصلی با هولوگرام اصالت»، «نمایندگی‌های رسمی»، «گارانتی معتبر شرکتی»، «شرکای تجاری» | Factual and legal claims. No store page documents them. |
| `ChatWidget.tsx:85` | «تمامی محصولات … ۷ روز مهلت تست» | Broader than `FAQ.tsx:15`. Aligning the wording with the FAQ narrows the promise and needs no new policy, but the owner approves the change. |
| `Footer.tsx:48`، `About.tsx:17` | «مرجع تخصصی» (self-ranking) | Forbidden in metadata. Visible copy stays until the owner approves the change. |
| `src/lib/catalogCopy.ts:27` (`CATALOG_HUB_H1`) | visible `/products` heading «… اورجینال» | Same authenticity word that was removed from the count line on the same page. Owner decides the heading. |
| `src/pages/static/Offers.tsx:32` | visible heading «پیشنهادهای ویژه و محدود» | The metadata no longer uses it. The visible heading still promises a limited offer. Owner decides. |

**Owner confirmations (2026-10-13):** the 7-day return window, the replacement-warranty terms and the authenticity guarantee with physical testing before shipping (`public/pricing.md`, `FAQ.tsx:15`, `FAQ.tsx:19`) are correct as written. The rows below stay open.

## Outside SEO metadata (not changed in this pass)

These are page content. They repeat claims that this register does not cover yet. They
need an owner's review before any change:

- `src/pages/static/About.tsx:20`: «بیش از ۷ سال تجربه» — not in this register yet; owner to confirm the figure.
- `src/pages/static/About.tsx`: «بهترین قیمت بازار»، «تضمین ۱۰۰٪ اصالت»، «تضمین‌کننده بهترین کیفیت».
- `src/components/FAQ.tsx`: «اصالت تمام محصولات… تضمین»، «ضمانت اصالت و سلامت فیزیکی».
- `src/components/Footer.tsx`, `src/components/ChatWidget.tsx`: «ضمانت اصالت»، «گارانتی».
- `src/pages/ProductDetail.tsx`: the «گارانتی و خدمات» label in the specification list (shows the product's own warranty field).
- `src/pages/static/Brands.tsx`, `src/pages/static/Offers.tsx`: brand-warranty and originality copy.
- `src/components/Footer.tsx`: «مرجع تخصصی عرضه مستقیم … با ضمانت اصالت و سلامت فیزیکی».
