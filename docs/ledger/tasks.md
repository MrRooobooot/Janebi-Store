# Tasks — Janebi Store · open work

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** open items only — waiting for a decision, for input, or running on a schedule.
> **Closed rounds:** `docs/archive/2026-10-13-tasks-done-rounds.md` (verbatim). Shipped changes are in `docs/ledger/changelog-agent.md`.
> **Not this file:** commit-level records → `docs/ledger/changelog-agent.md`; system map → `docs/reference/project-graph.md`; rules and stack → `AGENTS.md`.

## Open

### Needs a decision (from Round 2026-09-21)
- [ ] **پیشنهاد بعدی (نیاز تصمیم):** پریرندر زمان ساخت برای ۸۱ URL سایتمپ — شل فعلی برای خزندهٔ بدون JS خالی است (`#root` خالی، بدون `<noscript>`) و همین «Crawled – currently not indexed» (۱۳۴) را توضیح می‌دهد. اپ `createRoot` است ⇒ ریسک hydration ندارد.
  - Re-verified 2026-10-13: the live sitemap lists 81 `<loc>` entries; a product page has an empty `#root` and no `<noscript>`; the raw HTML carries only title, description and metadata.

### Done (2026-10-13, owner asked to fix)
- **Admin category dropdown** now offers only the 14 approved names (`src/lib/approvedCategories.ts`, checked against `docs/reference/CATEGORY-TREE.md` by `tests/unit/approved-categories.test.ts`). The default-image map and the preset gallery use the same names. Judgment call to confirm: the cable-protector preset, which had no approved name, now files under «کابل و سیم».
- **Still open:** the server accepts any text for `category` (`server/validators/index.ts`). Restricting it to the approved list would break import and seed scripts that use old names, so it needs a decision and a mapping first.

### Needs input (from Round 2026-09-16)
- ⚠️ **باز:** `features`/مشخصات فنی خالی (سند Google Docs خصوصی است — ورودی لازم). **بازبینی بصری عکس‌ها انجام شد (۱۴۰۵/۰۶/۳۰):** عدد سند («۹ مدل زیر ۱۰۰۰px») اشتباه بود — واقعیت: **۱۹ از ۳۷** عکس زیر ۱۰۰۰px (۹۰۰×۹۰۰؛ کمینه ۹۰۰، بیشینه ۲۵۰۰، بزرگ‌ترین فایل ۱۹۰KB). پس‌زمینهٔ ناسالم فقط ۳ مورد: `eh127` (بژ/سفید شکسته + خط کف استودیو)، `eh184` (صفحهٔ خاکستری + سایهٔ ریخته)، `eh186` (واترمارک قرمز ارلدام گوشهٔ بالا-چپ). **تصحیح خودکار پس‌زمینه رد شد:** floodfill با fuzz ۱۸٪ روی `eh127`/`eh184` پس‌زمینه را سفید کرد ولی بسته‌بندی سفید محصول را هم خورد (تأیید بصری) — فایل‌های تولیدشده پاک شدند و اصل‌ها دست‌نخورده‌اند؛ این کار به کات‌اوت دستی یا اصل عکس نیاز دارد. کانتکت‌شیت تازه: `earldom-sheet-2026-09-21.png` (۳۷ خانه) + `earldom-ba-2026-09-21.png` (قبل/بعد).
  - Re-verified 2026-10-13: 39 of 45 live products have no features or specs.

### ⏸ PENDING (منتظر ورودی کاربر) — جایگزینی کاتالوگ تستی با لیست واقعی
**وضعیت:** کاتالوگ تستی **پاک شد** (۱۴۰۵/۰۶/۲۵): ۱۲۷ کالای تستی حذف، تنها موجودی واقعی (۳۸ قلم هولدر ارلدام/باسئوس) روی prod ماند. بارگذاری بخش‌های بعدی انبار (قاب، گلس، کابل، شارژر، هندزفری، پاوربانک، هدفون، مبدل، گیمینگ، خودرو، ساعت، دانگل) با همان مسیر `docs/reports/2026-09-16-real-inventory-holder-import.md` انجام می‌شود.

**ورودی لازم (CSV، هر ردیف یک کالا):** `نام` · `برند` · `مدل/کد` · **`بارکد GTIN`** · **`قیمت خرید (تومان)`** · **`کانال (رسمی/خاکستری)`** · `قیمت دیجیکالا (اختیاری)` · `موجودی` · `دسته (از لیست بستهٔ مصوب)`

**کارهای آمادهٔ اجرا روی لیست واقعی:**
- [ ] import بخش‌های بعدی انبار (قاب، گلس، کابل، شارژر، هندزفری، پاوربانک، هدفون، مبدل، گیمینگ، خودرو، ساعت، دانگل) — منتظر CSV کاربر. کاتالوگ تستی ۱۲۷ قلمی قبلاً پاک شده بود (عدد «۱۳۸» در متن قدیمی اشتباه بود).
- [x] فیلد `costPrice` (و `barcode`) در schema + پنل ادمین + ستون حاشیه و «زیر کف» — دور ۰۹-۲۱ (schema/مایگریشن/API/پنل/تست).
- [x] پاک‌سازی برندهای تکراری — دور ۰۹-۲۱: روی prod برند تکراری نمانده (`ارلدام ۳۷` · `MCdodo ۷` · `بیسوس ۱`)؛ اسکریپت `merge-dup-brands.cjs` برای بارگذاری‌های بعدی اصلاح شد.
- [x] دسته‌بندی قیمتی خودکار هر ردیف (سبد `پک`/`زیر باند`/`هم‌تراز`/`مذاکره`/`حذف-تعویض`) با `scripts/data/price-watch.mjs` — دور ۰۹-۲۱. اتصال سبد به پنل ادمین بعد از ورود کاتالوگ واقعی (واقعیت بازار لازم است).
- [ ] فید ترب (نیاز به فرمت پنل ترب) · قیمت باشگاه (login-only) — کران روزانه در این دور انجام نشد (خارج از دامنهٔ درخواست).

**شاهد فعلی بازار:** `docs/reports/2026-09-14-price-position-report.md` (میانهٔ فاصله +۲۴٫۹٪ روی ۴۳ SKU برنددار خودکار-سنجیده‌شده)

### Standing automation: status unknown (checked 2026-10-13)
- **Not found** on 2026-10-13 in: this session's schedulers (CronList and scheduled tasks: none), this Mac's crontab and OpenClaw state, and the VPS crontab (only `backup-verify.sh` and `vps-monitor.py` are installed). The job may still exist in an agent system not reachable from here. Owner to confirm; until then do not count it as running.
- Created 2026-09-11 night at user request («تا فردا بهت میگم قطعش کنی»): every 3h (`0 */3 * * *`), workdir Janebi-Store, skills janebi-arena-production-readiness + surgical-refactor-playbook, deliver origin.
- Mission per run: boot local prod (DISABLE_CSP_UPGRADE_INSECURE=1) → `node scripts/audit/design-audit.mjs` (8 combos) → rotate hand-audit over /, /products, /blog, /offers, /brands, /cart, /login (2/run) → fix TOP 1–3 root-causes (index.css shims / dark: pairs) → gate (tsc, 8/8, verify) → commit+push+deploy (lock-respecting) → TASKS.md round entry.
- No-findings runs: db:backup + VPS backup check, report clean, no invented work. Deploy double-fail → git revert + BLOCKED tag.
- **USER MUST ASK TO PAUSE/REMOVE** (`cronjob_manage action=pause/remove job_id=7e0cad4fea09`) — not self-terminating.
