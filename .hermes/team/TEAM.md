# تیم ایجنتی جانبی — رُستر و پروتکل

> مدیر: Code-Pro (Hermes). سایر اعضا: subagent های ایزوله که فقط خروجی نهایی‌شان برمی‌گردد.
> قرارداد مشترک: خروجی JSON + فایل در همین پوشه. شواهد مستقیم (file:line) الزامی.

## رُستر

| ID | رُل | قلمرو | وظیفه دقیق |
|----|-----|-------|------------|
| MGR | مدیر تیم | کل مخزن + prod | تعریف وظایف، توزیع یافته‌ها، اعتبارسنجی متقابل، روتینگ فیکس‌ها، گیت نهایی (npm run verify + deploy) |
| R1 | backend-auditor | `server/` | تراکنش‌های سفارش/کوپن/پرداخت، منفی‌نشدن موجودی، VIP unwind، empty-catch، rate-limit پوشش، کش اینولیدیشن، پاریتی schema.ts↔schema.pg.ts، N+1 |
| R2 | frontend-auditor | `src/` | RTL/فارسی (ZWNJ، ارقام فارسی، تومان)، stale closure/race در fetch، نشتی مموری، a11y، re-render بی‌مورد، سازگاری توکن‌های index.css |
| R3 | security-auditor | cross-cutting | گیت requireAuth+requireAdmin روی همه /api/admin، JWT/refresh rotation، Zod روی همه POST/PUT، injection، ترaversal، secrets، helmet/CORS |
| R4 | qa-engineer | `tests/`, `e2e/` | اجرای کامل `npm run verify`، تست‌های flaky، شکاف پوشش نسبت به §4 پروژه‌گراف، سلامت e2e |
| R5 | seo-aeo-auditor | `public/`, JSON-LD, meta | llms.txt/robots/sitemap/structured-data (موج ۲) |
| FIX | fixer | طبق روتینگ مدیر | فقط فیکس آیتم‌های تأییدشده — قاعده: **یک بچه‌ی نویسنده در هر راند** |

## پروتکل تعامل (۳ موج)

1. **موج ۱ — کشف موازی:** R1–R4 همزمان audit فقط‌خواندنی → `.hermes/team/round1-<id>.json`
2. **موج ۲ — اعتبارسنجی متقابل:** مدیر یافته‌های هر member را به member دیگر می‌دهد برای رد/تأیید با شواهد؛ R5 (SEO) همزمان audit می‌کند. داپلیکیت‌ها ادغام، ادعای بی‌مدرک حذف.
3. **موج ۳ — فیکس:** فقط موارد critical/major تأییدشده → FIX (تک agent نویسنده) → MGR گیت `npm run verify` → deploy + تست live.

## فرمت یافته

```json
{"id":"R1-01","severity":"critical|major|minor|improvement","area":"...","file":"path","line":"N","title":"...","evidence":"کد واقعی","suggested_fix":"..."}
```

## قواعد سخت

- اعضای audit فقط‌خواندنی‌اند (به‌جز فایل یافته‌های خودشان).
- severity کالیبره: critical=از‌دست‌رفتن داده/حفره امنیتی، major=باگ مستقیم، minor=لبه، improvement=فرصت. حدس = باید علامت بخورد.
- قبل از گزارش، §5 (Known Gaps) پروژه‌گراف خوانده شود — موارد قبلاً‌فیکس‌شده دوباره گزارش نشود.
- هیچ‌کس deploy/commit نمی‌کند جز MGR.
