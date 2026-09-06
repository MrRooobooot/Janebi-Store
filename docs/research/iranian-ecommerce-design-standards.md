# Iranian E-commerce Storefront Design Standards — Research Findings
Researched 2026-09-06 for Janebi-Store (janebiarena.ir) comparison. Method: web_search backends were down (403/timeouts), so evidence was gathered via Wayback Machine snapshots of live sites (blocked-page-recovery ladder) and direct fetches of enamad.ir and Vazirmatn GitHub. HTML/CSS was parsed programmatically. Note: Digikala's current site is a client-rendered SPA, so its homepage snapshot is a shell — but its full shipped CSS bundle (Digi Design System tokens) WAS recovered, which is stronger evidence than prose.

Evidence strength legend: [LIVE-SNAPSHOT] = parsed from archived HTML/CSS of the site (cite snapshot date), [OBSERVED] = direct fetch, [INFERRED] = general knowledge, not directly verified this session.

## 1. Digikala Design System specifics

1.1 Brand red — EXACT TOKENS
- (a) Digikala's palette is literally tokenized in its CSS: `--color-primary-500:#ef4056`, `--color-primary-700:#ef394e`, `--color-primary-300:#f37a8a`, `--color-primary-tonal:#ffe6eb` (pink tint bg), plus `--color-button-primary:#ef4056` and `--color-icon-primary:#ef4056`. The discount badge has dedicated mode tokens: `--dds-mode-discount-badge-error-bg:#eb3850` with white text, and gradient variants `--dds-theme-primary-primary-base:#ed1944` / `gradient:#e40138`. Their design system is called "DDS" (`data-dds-style`, `data-dds-theme="shop"`, `dds-color-badge` web components).
- (b) https://web.archive.org/web/20260906075311/https://www.digikala.com/ + its CSS chunks (digi.css extracted)
- (c) LIVE-SNAPSHOT (2026-09-06) — strongest evidence in this study

1.2 Typography
- (a) `--font-family: IRANYekan, sans-serif` — IRANYekan is self-hosted with weights 100/300/400/500/700/800/900/950, `font-display:swap`, eot/woff2/woff/ttf. No Vazirmatn anywhere in Digikala's CSS (count: 0). IRANYekan family = the de-facto Iranian e-commerce typeface.
- (b) same CSS bundle; font-face rules verbatim
- (c) LIVE-SNAPSHOT (2026-07-11 cart CSS / 2026-09-06 home CSS)

1.3 Color token scale (for comparison to Janebi tokens)
- (a) Neutrals: `#f0f0f1/#e0e0e2/#c0c2c5/#a1a3a8/#81858b/#62666d` (neutral-100…600). Semantic hints: success `#4caf50` (object) / `#2e7b32` (text), error `#d32f2f`/`#b2001a`, caution `#f9a825`/`#f57f17`. Secondary blue `#19bfd3` (classic Digikala cyan, still present as `--color-blue-primary`) and `--color-secondary-500:#1672dd`. Rating star colors are VALUE-SCALED: 0–2★ `#f9bc00`, 2–3★ `#b1b64d`, 3–4★ `#65aa57`, 4–5★ `#00a049` (bad=yellow, good=green).
- (b) same CSS bundle
- (c) LIVE-SNAPSHOT

1.4 Price display pattern
- (a) Price block = [red percent badge with ٪ icon] + bold current price in LATIN digits with comma thousands separators + small "تومان" label to the LEFT (i.e. after digits in RTL flow, `mr-1` gap) + original price in smaller size with `line-through` (strikethrough) beneath/beside. Verified verbatim in Technolife's markup which follows the identical pattern: `<p class="text-base font-semiBold">14,609,000</p><span class="text-xs">تومان</span>` + `<p class="line-through text-primary-tint-5">…` and a `bg-red-60` rounded badge with white percent icon + number "3". Digikala's 2016 SSR page already used the same: `class="old-price"` (strikethrough) above `class="final-price">…<span class='currency'>تومان</span>`, with prices divided by 10 from rial→toman (`MinPrice/10`).
- (b) https://web.archive.org/web/20250415081005/https://www.technolife.ir/ ; https://web.archive.org/web/20160928115504/http://www.digikala.com/Product/DKP-00002
- (c) LIVE-SNAPSHOT (both)

1.5 Currency: toman, not rial
- (a) Storefronts display تومان; the /10 conversion from rial is done server-side. 2016 Digikala template literally divides by 10 before render.
- (b) same as 1.4(b)
- (c) LIVE-SNAPSHOT (2016 code path); current Digikala uses toman labels [INFERRED for current SPA since shell snapshot has no prices]

1.6 Rating stars
- (a) 5-star row, colored by score band (see 1.3), shown on cards and product page as "امتیاز کاربران".
- (b) digi.css rating tokens; 2016 product page "امتیاز کاربران به: …"
- (c) LIVE-SNAPSHOT (2016 page); current band-coloring from CSS [LIVE-SNAPSHOT]

1.7 Header mega-menu / category tree
- (a) Top header: logo right, search bar center (search has popular/suggestion dropdown), left: login/cart. Below/inside: "دسته‌بندی کالاها" mega-menu with hover-flyout subcategories. Torob (2026 snapshot) ships exactly this nav: موبایل و کالای دیجیتال / لپ‌تاپ، کامپیوتر، اداری / هایپر مارکت / لوازم خانگی / مد و پوشاک / زیبایی و بهداشت … with "ورود / ثبت نام" left. Emalls likewise: "دسته‌بندی کالاها … جستجو … ورود | ثبت‌نام".
- (b) torob + emalls snapshots above
- (c) LIVE-SNAPSHOT (text extracted from archived nav)

1.8 Mobile bottom nav
- (a) Digikala home shell sets `data-dds-device="mobile"` and ships a PWA manifest + splash-screen set for every iPhone/iPad size — mobile-first app-like shell with fixed bottom tab bar (home/categories/cart/profile) is the standard [INFERRED for tab items — shell snapshot doesn't render nav items, but PWA/mobile shell confirmed LIVE-SNAPSHOT].

1.9 Buy-box & checkout
- (a) 2016 product page buy-box service badges, verbatim order: «تحویل اکسپرس | پرداخت در محل | ٧ روز ضمانت بازگشت | ضمانت اصل بودن کالا | تضمین بهترین قیمت» — this exact badge row is the canonical Digikala buy-box. Checkout is a stepped flow (cart → address/استان+شهر → shipping → payment) [flow steps INFERRED — not directly captured].
- (b) 2016 snapshot above
- (c) LIVE-SNAPSHOT (badges) / INFERRED (steps)

1.10 Trust elements on Digikala
- (a) ENAMAD badge in footer [INFERRED — current home snapshot is a pre-render shell; every competitor checked (Technolife, Mobit, Snapp, Torob) ships ENAMAD footer badges, and Digikala is a known ENAMAD holder]. Phone support displayed: Digikala's 2016 schema.org shows `telephone: +98-21-61930000, contactType: customer service`.
- (b) 2016 snapshot schema.org JSON-LD
- (c) phone: LIVE-SNAPSHOT (2016); ENAMAD: INFERRED

## 2. Common Iranian e-commerce UX conventions

2.1 Price formatting
- (a) Latin digits + comma grouping (14,609,000) + تومان label. Technolife product cards show exactly this; Digikala same [prices on current digi SPA not captured — pattern verified via Technolife + 2016 Digikala]. NOTE for Janebi: Janebi currently uses Persian digits; Iranian majors display prices in Latin digits with commas — either is acceptable, but comma grouping + explicit تومان is universal.
- (c) LIVE-SNAPSHOT (Technolife); Digikala 2016 LIVE-SNAPSHOT

2.2 ZWNJ (نیم‌فاصله, U+200C)
- (a) Heavy, correct ZWNJ usage everywhere: Technolife HTML contains 236 U+200C chars; Snapp 53; Torob 8; meta description uses «دیجی‌کالا», «می‌توانید», «به‌راحتی». Words like دیجی‌کالا، می‌شود، به‌علاوه must carry ZWNJ, not space.
- (b) technolife/snapp/torob snapshots
- (c) LIVE-SNAPSHOT

2.3 Stock & warranty phrasing
- (a) «گارانتی معتبر» / «با گارانتی و ارسال سریع» in Technolife meta & body (5 hits); «موجود در انبار» is the canonical stock phrase [INFERRED — did not appear in the archived snapshots parsed; phrase is standard Digikala wording]. Warranty info block on product page = seller + warranty (گارانتی) + shipping (ارسال) rows [INFERRED].
- (c) Technolife: LIVE-SNAPSHOT; exact stock string: INFERRED

2.4 Province/city (استان/شهر) selection
- (a) Address forms select استان then شهر; Technolife home even encodes its own address as «استان تهران، تهران، منطقه ۱۲، پل حافظ» in schema.org with Persian digits.
- (c) LIVE-SNAPSHOT (technolife)

2.5 Free shipping / guarantees marketing
- (a) Digikala meta description (canonical SEO copy of the whole genre): «✓ارسال رايگان ✓پرداخت در محل ✓ضمانت بازگشت کالا». «تضمین بهترین قیمت» (best-price guarantee) as a named badge since at least 2016. Mobit footer: «لغو و بازگشت کالا / ضمانت اصالت کالا / خدمات مشتریان» with a 64px «تضمین اصالت کالا» SVG badge (`data-test-id="footer-orginal-guarantee"`).
- (b) digikala home meta (2026 snapshot), 2016 product page, mobit snapshot (2026-08-09)
- (c) LIVE-SNAPSHOT

2.6 Search with suggestions
- (a) Prominent search bar in header center with suggestion dropdown; Emalls shows trending queries under the box («جستجو در بخاری نفتی و گازوئیلی، برنج پاکستانی، …»).
- (c) emalls LIVE-SNAPSHOT; digikala search UI INFERRED (SPA shell)

2.7 Order tracking
- (a) «پیگیری سفارش» is a top-level header/footer link on Torob and Technolife (1 hit each in nav text).
- (c) LIVE-SNAPSHOT (both)

2.8 App-install banner
- (a) Torob header: «نصب اپلیکیشن ترب‌پی» — app-install strip is a common convention.
- (c) LIVE-SNAPSHOT (torob)

## 3. RTL-specific standards

3.1 dir/lang
- (a) `<html lang="fa" dir="rtl">` exactly as Digikala ships it; maximum-scale=1.0 viewport on mobile commerce.
- (c) LIVE-SNAPSHOT (digikala home head)

3.2 RTL margin/spacing handling
- (a) Modern builds use logical properties + utility-class flips: Technolife mixes 542 `ms-`/`me-` (margin-start/end) usages with legacy `mr-1` (margin-right for RTL "after-price" gap, seen on the تومان label); Digikala CSS uses `margin-inline-start` and `:lang(fa)`-scoped selectors (e.g. badge-group gap flips for RTL languages). Icons: percent/star icons are symmetric; directional icons (chevrons, arrows) mirror in RTL — Digikala implements this via `:lang(fa)` scoped rules in its badge/button CSS [mirroring mechanism LIVE-SNAPSHOT; chevron specifics INFERRED].
- (c) LIVE-SNAPSHOT (technolife html, digi.css)

3.3 Font sizes
- (a) Persian web UI runs compact: Digikala's shipped CSS contains font-size steps 8–22px with 12/13/14/16px dominating and rem steps 1.2–2.2 (=12–22px). Base body ≈ 12–14px on desktop cards; 16px+ for product titles. (i.e. smaller than typical Western 16px base — dense UI is the norm.)
- (c) LIVE-SNAPSHOT (digi.css)

3.4 Persian vs Latin digits
- (a) Split practice: Digikala used Persian digits for phone numbers in 2016 («۰۲۱۶۱۹۳۰۰۰۰») and Technolife uses Persian digits for dates/years (۱۴۰۴) but LATIN digits + commas for prices. Mobit self-hosts `IRANSansXFaNum` (the FaNum digit-styled variant of IRANSansX). So: prices = Latin digits with commas is the marketplace norm; Persian digits elsewhere (or FaNum font).
- (c) LIVE-SNAPSHOT (all three)

3.5 Typeface landscape
- (a) IRANYekan (Digikala, Torob `font-family:iranyekan`, Emalls `IRANYekanXVF` variable font), IRANSansX (Mobit). Vazirmatn (Janebi's choice) is the leading FREE/open-source Persian font (rastikerdar/Vazirmatn, started 2015, Roboto-combined Latin) but was found in none of the four commercial CSS bundles checked — it's the standard for indie/dev-built sites, IRANYekan the standard for big commerce.
- (b) site CSS snapshots + https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/README.md
- (c) LIVE-SNAPSHOT / OBSERVED (GitHub raw)

## 4. Trust signals

4.1 ENAMAD (نماد اعتماد الکترونیکی)
- (a) Official badge image served from `trustseal.enamad.ir/logo.aspx?id=…&Code=…`, wrapped in a nofollow link to `trustseal.enamad.ir/?id=…`, placed in the FOOTER, with alt text «نماد اعتماد الکترونیکی [store name]» and `referrerpolicy="origin"`. Confirmed verbatim on Technolife (id=95954) and present on Mobit, Snapp, Torob. enamad.ir itself: the badge is issued by مرکز توسعه تجارت الکترونیکی and verifies the identity of the online business.
- (b) technolife snapshot (exact markup), enamad.ir (live fetch)
- (c) LIVE-SNAPSHOT + OBSERVED

4.2 Second badge: ساماندهی
- (a) Technolife footer also shows «ساماندهی تکنولایف» (samandehi.ir national media registration badge) next to ENAMAD. Kasbokar (سازمان صنفی رایانه‌ای) membership is cited in text («عضویت در سازمان صنفی رایانه‌ای کشور») — the union badge image didn't appear in this snapshot.
- (c) LIVE-SNAPSHOT (technolife: enamad + samandehi alts)

4.3 Phone support display
- (a) Displayed in header/footer; Digikala publishes `+98-21-61930000` as `contactType: customer service` in schema.org ContactPoint; Technolife LocalBusiness JSON-LD also includes `telephone`.
- (c) LIVE-SNAPSHOT (both)

4.4 Return policy / authenticity badges
- (a) Footer link trio (Mobit, verbatim): «لغو و بازگشت کالا | ضمانت اصالت کالا | خدمات مشتریان» + visual «تضمین اصالت کالا» badge; Digikala buy-box: «٧ روز ضمانت بازگشت | ضمانت اصل بودن کالا».
- (c) LIVE-SNAPSHOT (mobit 2026, digikala 2016)

4.5 Payment gateway logos
- (a) Zarinpal/Saman logos in footer or payment step [INFERRED — 'zarinpal' string not in any homepage snapshot; payment logos appear at checkout which wasn't captured. Saman Bank string appeared in Torob/Mobit/Snapp HTML but likely as script/bank references, not verified as logo].
- (c) INFERRED

## PRIORITY CHECKLIST — what a standard Iranian storefront MUST have
MUST (habituation-level; absence feels "wrong" to Iranian shoppers):
1. `<html lang="fa" dir="rtl">` + correct ZWNJ (نیم‌فاصله) in all UI copy (دیجی‌کالا-style compounds).
2. Persian commerce font (IRANYekan family for commerce credibility; Vazirmatn acceptable for open-source stacks), weight range ≥ 400/500/700, compact sizes 12–16px base.
3. Price: bold number + «تومان» label (toman, never rial) + comma grouping; original price strikethrough; red ٪ discount badge (white text, rounded, ~#ef4056/#eb3850 family) on cards AND product page.
4. Red brand accent (~#ef4056 Digikala red is the genre's default CTA color), white cards on light-gray canvas (#f0f0f1-family), green for success/stock.
5. Buy-box on product page with the canonical service-badge row: ارسال رایگان/اکسپرس، پرداخت در محل، ۷ روز ضمانت بازگشت، ضمانت اصل بودن کالا، (تضمین بهترین قیمت).
6. ENAMAD badge in footer linking to trustseal.enamad.ir (image must come from enamad domain), ideally + ساماندهی badge.
7. Visible phone support number (header/footer, Persian digits acceptable) + «خدمات مشتریان / لغو و بازگشت کالا / ضمانت اصالت کالا» footer links.
8. Header: logo (right) + central search with suggestions + ورود/ثبت‌نام + سبد خرید; category mega-menu («دسته‌بندی کالاها») with flyouts.
9. Mobile: app-like shell, sticky «افزودن به سبد خرید» buy bar [sticky bar INFERRED — standard mobile pattern, not directly captured], bottom tab nav, PWA manifest.
10. Address flow with استان → شهر cascading selects; «پیگیری سفارش» order-tracking entry point.

SHOULD:
11. Rating stars on cards/product page, colored by score (yellow→green), with review count.
12. Stock phrasing «موجود در انبار» / warranty «گارانتی معتبر» rows in buy-box; seller info block.
13. Free-shipping threshold banner + best-price guarantee badge.
14. Zarinpal (plus a bank gateway: Saman/etc.) recognizable at payment step; gateway logos in footer/checkout.
15. Persian digits for phone numbers/dates; Latin digits with commas for prices (Digikala/Technolife norm) — Janebi's all-Persian-digit prices are a defensible variant but differ from the majors.

## Gaps / caveats
- Digikala's live DOM (cards, buy-box, checkout steps, mobile nav items) could not be rendered this session (SPA + fetch backends 403); its design tokens come from its own shipped CSS bundle, which is authoritative for colors/fonts/badges.
- «موجود در انبار» string, sticky mobile buy bar, checkout step names, and Zarinpal logo placement are marked INFERRED — conventional but not directly captured in this session's snapshots.
- Raw evidence saved under /tmp/iran_ecom/ (digi.css, digi_cart.css, technolife.html, mobit.html, torob.html, snapp.html, emalls.html, okala.html, digi_product2016.html, enamad.html).
