# گزارش اجرا: حذف PostgreSQL از سرور جانبی

**وضعیت: اجرا شد — ۱۳ اکتبر ۲۰۲۶.** این سند سابقه‌ی اجراست. نسخه‌ی آماده‌سازی قبلی («اجرا نشده») در تاریخچه‌ی git باقی است (کامیت `960392c`).

---

## نتیجه

- PostgreSQL از سرور `janebi` کاملاً حذف شد. برنامه فقط از SQLite استفاده می‌کند (`data/janebi.db`).
- نسخه‌ی زنده: `release=1e999f8`، `dirty=false` (`/BUILD_INFO`).
- `/api/health`: `{"status":"ok","database":"ok"}`.
- `monitor.log`: `[monitor] all clear`.
- تنها کانتینر روی سرور `janebi-store` است. Compose فقط سرویس `app` را دارد.

بررسی‌های بالا زنده و فقط‌خواندنی بودند و در ۱۳ اکتبر ۲۰۲۶ انجام شدند.

---

## تغییرات انجام‌شده

| مورد | نتیجه | شاهد |
|---|---|---|
| کانتینر `janebi-postgres` | حذف شد (بدون `-v`) | `docker ps -a` فقط `janebi-store` را نشان می‌دهد |
| volume `janebi-store_janebi_pgdata` | حذف شد | شمارش `docker volume ls` برابر ۰ |
| آرشیو سرد `~/backups/pg-cold/` | حذف شد | پوشه روی سرور نیست |
| `docker-compose.yml` فعال | جایگزین شد با نسخه‌ی `1e999f8` | SHA-256 پیشوند `a9cc6c5a` |
| `scripts/ops/vps-monitor.py` | جایگزین شد با نسخه‌ی repo | SHA-256 پیشوند `2bb5ab69` |

---

## آزمون بازیابی (پیش از حذف)

- آرشیو ۱۲ اکتبر (`janebi-pgdata-cold-20261012-162916.tar.gz`، SHA-256 `df1fe638…`) در یک volume ایزوله و بدون شبکه بالا آمد. خطای FATAL نداشت و recovery خودکار هم نداشت.
- این آرشیو صفر جدول کاربری داشت. یعنی PostgreSQL هیچ داده‌ی برنامه‌ای نداشت؛ برنامه همیشه SQLite را می‌خواند.
- خطای `Permission denied` روی `stat` دایرکتوری داده (مالک uid ۷۰) بود و روی نتیجه اثری نداشت.

---

## تفاوت با برنامه‌ی آماده‌سازی

- آرشیو تازه‌ی بخش ۲ گرفته نشد. مبنا همان آرشیو ۱۲ اکتبر بود.
- نسخه‌ی قبلی `docker-compose.yml` در `~/backups` ذخیره نشد. نسخه‌ی قبل از حذف سرویس در تاریخچه است: `fcd3582^:docker-compose.yml`. این نسخه مقدار رمز fallback دارد؛ آن را چاپ نکنید.
- **بازگشت به PostgreSQL دیگر ممکن نیست:** هم volume و هم آرشیو حذف شده‌اند. این سند فقط ثبت تاریخی است.

---

## باز مانده

- رمز fallback قدیمی PostgreSQL در تاریخچه‌ی عمومی GitHub باقی است (کامیت `3b9ecff` و چند کامیت دیگر). چرخش رمز یا بازنویسی تاریخچه تصمیم مالک است. حذف PostgreSQL این را پاک نمی‌کند.
- کپی‌های روزانه‌ی `.env` در `~/backups/env-*.bak` و بکاپ روزانه‌ی دیتابیس به Bale هنوز فعال‌اند. تصمیم درباره‌ی آن‌ها با مالک است.
- `~/backups/vps-monitor.new.py` (۱۲ اکتبر) منشأ شناخته‌شده ندارد و دست نخورده مانده است.
- `~/backups/vps-monitor.pre-pgremoval.py` نسخه‌ی قبلی monitor است و نگه داشته شده.

---

## قواعد Compose برای این سرور

- همه‌ی دستورها با `-p janebi-store --project-directory /home/ubuntu/Janebi-Store`. بدون آن، Compose یک volume خالی با نام دیگر می‌سازد.
- ممنوع: `docker compose down`، `--remove-orphans`، `docker rm -v`، `docker volume prune`.
