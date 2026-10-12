# Runbook: حذف PostgreSQL از Production

وضعیت: **آماده‌سازی؛ اجرا نشده.** این runbook فقط بعد از برآورده‌شدن همه‌ی گیت‌های بخش ۰ و دریافت مجوز کتبی مالک اجرا می‌شود. هیچ‌یک از دستورهای تغییردهنده تا آن زمان نباید اجرا شوند.

مرجع‌ها:
- commit کد: `1e999f8` (پشته: `fcd3582` → `cfb9a1a` → `1e999f8`). SHA دقیق نسخه‌ی فعال را همیشه از `/BUILD_INFO` بخوانید.
- آرشیو سرد: `/home/ubuntu/backups/pg-cold/janebi-pgdata-cold-20261012-162916.tar.gz`
- SHA-256 مورد انتظار آرشیو: `df1fe63817c86c05740adba1a5e82c4f24d4f2a81135ec5a50149ee6cd54b394`
- volume: `janebi-store_janebi_pgdata` (ساخته‌شده `2026-08-23T13:43:40Z`)
- کانتینر: `janebi-postgres` (image `postgres:15-alpine`، restart policy `unless-stopped`)
- پروژه‌ی Compose: `janebi-store` (از نام پوشه‌ی `/home/ubuntu/Janebi-Store` گرفته می‌شود)

**قاعده‌ی کلی برای همه‌ی دستورهای Compose:** همیشه `-p janebi-store --project-directory /home/ubuntu/Janebi-Store` را بدهید. اگر فایل compose را از پوشه‌ی دیگری (مثلاً `backups/`) بخوانید، Compose نام پروژه‌ی جدید می‌سازد و volume با نام متفاوت و **خالی** ساخته می‌شود. ممنوع: `docker compose down` (شبکه و کانتینرهای پروژه را حذف می‌کند)، `--remove-orphans` و `docker rm -v`.

---

## ۰) گیت‌های پیش از شروع

همه‌ی گیت‌ها باید با شواهد تأیید شوند. اگر یکی برقرار نبود، متوقف شوید.

| گیت | شرط | شاهد |
|---|---|---|
| G1 provenance | commit `1e999f8` ancestor `origin/main` است و merge بدون squash/rebase انجام شده | `git merge-base --is-ancestor 1e999f8 origin/main` |
| G2 monitor | نسخه‌ی monitor روی سرور همان نسخه‌ی repo با `CONTAINERS = ["janebi-store"]` است | `sha256sum` دو فایل برابر؛ اجرای دستی monitor خروجی `all clear` |
| G3 مجوز مالک | مجوز کتبی و تاریخ‌دار برای: انتقال فایل compose، به‌روزرسانی compose، توقف و حذف کانتینر. حذف volume مجوز جدا دارد (بخش ۵) | پیام مالک |
| G4 سلامت | `/api/health` = `ok`؛ `janebi-store` و `janebi-postgres` در حال اجرا | `curl` و `docker inspect` |
| G5 نسخه‌ی زنده | `/BUILD_INFO` نسخه‌ای است که دیگر کد PostgreSQL ندارد (`1e999f8` یا بعدتر) | `curl` |
| G6 آرشیو | checksum و فهرست آرشیو معتبرند (بخش ۱) | بخش ۱ |
| G7 بازگشت | `releases/<نسخه‌ی قبلی>/dist` کامل است | بخش ۷ |

**ترتیب G2 مهم است:** monitor قدیمی `janebi-postgres` را پایش می‌کند. با توقف کانتینر، `exited` می‌بیند و هر ۵ دقیقه هشدار می‌فرستد؛ پس از حذف، `not found`. نصب monitor باید **قبل از بخش ۳** (توقف) انجام شده باشد.

---

## ۱) ثبت وضعیت و تأیید آرشیو (فقط‌خواندنی)

```bash
ARCH=/home/ubuntu/backups/pg-cold/janebi-pgdata-cold-20261012-162916.tar.gz
EXPECTED=df1fe63817c86c05740adba1a5e82c4f24d4f2a81135ec5a50149ee6cd54b394
ACTUAL="$(sha256sum "$ARCH" | cut -d' ' -f1)"
[ "$ACTUAL" = "$EXPECTED" ] && echo CHECKSUM_OK || echo CHECKSUM_MISMATCH
tar -tzf "$ARCH" >/dev/null && echo ARCHIVE_LIST_OK
tar -tzf "$ARCH" | grep -c '^\./PG_VERSION$'   # باید 1 باشد
```

وضعیت کانتینرها و volume (مسیر دقیق و نام دقیق):
```bash
docker inspect janebi-postgres janebi-store \
  --format '{{.Name}} state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} restarts={{.RestartCount}} policy={{.HostConfig.RestartPolicy.Name}}'
docker volume inspect janebi-store_janebi_pgdata --format '{{.Name}} {{.CreatedAt}} {{.Mountpoint}}'
docker ps -a --filter volume=janebi-store_janebi_pgdata --format '{{.Names}}'
docker network inspect janebi-store_default --format '{{range .Containers}}{{.Name}} {{end}}'
```

ثبت خط پایه‌ی SQLite (فقط شمارش، بدون محتوا؛ فقط خواندن):
```bash
docker exec janebi-store node -e 'const D=require("better-sqlite3");const d=new D("/app/data/janebi.db",{readonly:true});console.log(JSON.stringify({products:d.prepare("select count(*) c from products").get().c,users:d.prepare("select count(*) c from users").get().c,orders:d.prepare("select count(*) c from orders").get().c,integrity:d.prepare("pragma integrity_check").get().integrity_check}))'
```
شمارش‌ها را ذخیره کنید؛ بخش ۶ با آن مقایسه می‌شود.

**تازگی آرشیو:** آرشیو فعلی در `16:29:16 UTC` گرفته شده، اما کانتینر پس از آن restart شده و `global/pg_control` در `16:34:21 UTC` تغییر کرده است. یعنی volume زنده با آرشیو بایت‌به‌بایت برابر نیست (نوشتن‌های startup). **قبل از توقف نهایی** (بخش ۳) یک آرشیو تازه با مجوز جدا بگیرید، checksum و فهرست آن را بررسی کنید و هر دو آرشیو را نگه دارید. آرشیو تازه باید پس از توقف تمیز (`docker stop`) گرفته شود.

---

## ۲) به‌روزرسانی Compose فعال روی سرور

هدف: `docker-compose.yml` سرور همان فایل repo در commit منتشرشده باشد (بدون سرویس `postgres`).

**تذکر امنیتی:** نسخه‌ی فعلی compose روی سرور و نسخه‌ی قبلی در تاریخچه، مقدار fallback رمز را دارند. **این فایل‌ها را کامل چاپ نکنید.** برای مقایسه از `diff -q` یا `grep -v POSTGRES_PASSWORD` استفاده کنید.

```bash
# ماشین محلی: فایل مرجع را از commit در پوشه‌ی موقت (scratchpad) بسازید
SCRATCH="<مسیر scratchpad نشست>"
git -C /Users/aidin/Desktop/Janebi-Store show 1e999f8:docker-compose.yml > "$SCRATCH/compose.new.yml"
shasum -a 256 "$SCRATCH/compose.new.yml" | cut -d' ' -f1   # این مقدار را یادداشت کنید
```

```bash
# انتقال به مسیر staging روی سرور (نه مسیر فعال). نیازمند مجوز G3.
scp -p "$SCRATCH/compose.new.yml" janebi:/home/ubuntu/backups/docker-compose.new.yml
```

```bash
# روی سرور: پشتیبان فایل فعال، بررسی checksum، و سپس جایگزینی
cp -p /home/ubuntu/Janebi-Store/docker-compose.yml /home/ubuntu/backups/docker-compose.pre-pgremoval.yml
sha256sum /home/ubuntu/backups/docker-compose.new.yml | cut -d' ' -f1   # باید برابر مقدار محلی باشد
docker compose -p janebi-store --project-directory /home/ubuntu/Janebi-Store -f /home/ubuntu/backups/docker-compose.new.yml config -q && echo COMPOSE_VALID
mv -f /home/ubuntu/backups/docker-compose.new.yml /home/ubuntu/Janebi-Store/docker-compose.yml
diff -q /home/ubuntu/backups/docker-compose.pre-pgremoval.yml /home/ubuntu/Janebi-Store/docker-compose.yml || true
grep -c '^  postgres:' /home/ubuntu/Janebi-Store/docker-compose.yml   # باید 0 باشد
```

نکته‌ها:
- `config -q` محتوا را چاپ نمی‌کند. اعتبارسنجی را روی فایل staging انجام دهید، نه فایل فعال.
- `mv` روی همان فایل‌سیستم اتمیک است؛ `scp` مستقیم روی فایل فعال نکنید.
- **این مرحله کانتینر را recreate نمی‌کند.** `docker compose up` کامل یا `docker compose down` اجرا نشود. بعد از این مرحله `docker compose -p janebi-store ps` باید `janebi-postgres` را به‌عنوان کانتینر بدون سرویس نشان دهد.
- `release.sh` فایل compose سرور را به‌روز نمی‌کند؛ این مرحله جدا است.

---

## ۳) توقف و حذف کانتینر PostgreSQL

ترتیب: restart policy → بررسی‌های پیش از توقف → توقف → بررسی → حذف کانتینر. **volume حذف نمی‌شود.**

بررسی‌های پیش از توقف (فقط‌خواندنی):
```bash
docker exec janebi-store sh -c 'case "$DATABASE_URL" in postgres*) echo PG_CONFIGURED;; *) echo SQLITE_OK;; esac'
docker network inspect janebi-store_default --format '{{range .Containers}}{{.Name}} {{end}}'   # برنامه و postgres، هیچ سرویس دیگری
```
اگر `PG_CONFIGURED` دیده شد، متوقف شوید.

```bash
docker update --restart=no janebi-postgres          # بعد از reboot بالا نیاید
docker stop -t 60 janebi-postgres                   # توقف تمیز با مهلت ۶۰ ثانیه
docker inspect janebi-postgres --format '{{.State.Status}} {{.HostConfig.RestartPolicy.Name}}'
```

بررسی بعد از توقف، پیش از حذف کانتینر:
```bash
curl -s -m 10 http://127.0.0.1:3000/api/health | cut -c1-60        # باید "ok" باشد
curl -s -m 15 https://janebiarena.ir/BUILD_INFO | cut -c1-120      # SHA مورد انتظار، dirty=false
date -u +%d/%b/%Y:%H:%M:%S    # زمان مبنا را یادداشت کنید؛ 5xx بعد از این زمان را بشمارید
```

حذف صریح کانتینر (**بدون `-v`**؛ volume نامدار می‌ماند):
```bash
docker rm janebi-postgres
docker volume inspect janebi-store_janebi_pgdata --format '{{.Name}}'   # باید موجود باشد
docker network inspect janebi-store_default --format '{{range .Containers}}{{.Name}} {{end}}'   # فقط janebi-store
```

---

## ۴) نگهداری آرشیو و volume

- **آرشیو سرد:** دوره‌ی نگهداری را مالک تعیین می‌کند (پیشنهاد: ۳۰ روز از زمان توقف، با تاریخ پایان مشخص). تا پایان دوره حذف نشود و هیچ‌گاه در Git یا مسیر عمومی کپی نشود. اگر آرشیو تازه‌ی بخش ۱ گرفته شد، هر دو آرشیو تا پایان دوره نگه داشته شوند.
- **volume:** بعد از حذف کانتینر، تا پایان دوره‌ی نگهداری باقی بماند تا بازگشت ممکن باشد.
- **بازیابی آزمایشی آرشیو** (`16:29`) قبلاً روی volume موقت با `--network none` انجام شد و `PostgreSQL 15.19` بدون FATAL بالا آمد. این تست **کوئری داده** نبوده است؛ اگر مالک تأیید داده بخواهد، جداگانه مجوز بگیرید.

---

## ۵) حذف volume (فقط پس از تأیید نهایی مالک)

پیش‌شرط‌ها — همه باید برقرار باشند:
1. مدت نگهداری تمام شده و مالک حذف را **کتباً** تأیید کرده است.
2. checksum آرشیوی که نگه داشته می‌شود برابر مقدار ثبت‌شده است (بخش ۱).
3. هیچ کانتینری از volume استفاده نمی‌کند: `docker ps -a --filter volume=janebi-store_janebi_pgdata` خروجی خالی دارد.
4. نام دقیق بررسی شده است: `docker volume ls -q | grep -x janebi-store_janebi_pgdata` (با `-x`، نه جستجوی زیررشته).

```bash
docker volume rm janebi-store_janebi_pgdata      # بدون -f؛ اگر در استفاده باشد خطا می‌دهد
docker volume ls -q | grep -c -x janebi-store_janebi_pgdata   # باید 0 باشد
```

---

## ۶) تأیید پس از هر مرحله

| بررسی | معیار |
|---|---|
| `/api/health` | `{"status":"ok","database":"ok"}` |
| `/BUILD_INFO` | SHA مورد انتظار و `dirty=false` |
| SQLite | `integrity_check=ok`؛ شمارش‌ها نسبت به خط پایه‌ی بخش ۱ غیرکاهشی |
| نقاط اصلی | `/`، `/products`، `/blog`، `/about`، `/api/products`، `/api/categories` با `200` |
| پایش | اجرای دستی `python3 /home/ubuntu/Janebi-Store/scripts/ops/vps-monitor.py` با خروجی `all clear` (این اجرا فایل state را به‌روز می‌کند) |
| 5xx | پس از زمان مبنا بدون خطای جدید؛ شمارش با `awk` روی زمان nginx |

```bash
sudo -n awk -v t="<زمان مبنا>" '$4 > "["t && $9 ~ /^5/' /var/log/nginx/access.log | wc -l
```

---

## ۷) بازگشت (Rollback)

| مرحله‌ی انجام‌شده | بازگشت |
|---|---|
| compose جایگزین شد | `cp -p /home/ubuntu/backups/docker-compose.pre-pgremoval.yml /home/ubuntu/Janebi-Store/docker-compose.yml` |
| کانتینر متوقف شد | `docker update --restart=unless-stopped janebi-postgres && docker start janebi-postgres` |
| کانتینر حذف شد (volume باقی است) | `docker compose -p janebi-store --project-directory /home/ubuntu/Janebi-Store -f /home/ubuntu/backups/docker-compose.pre-pgremoval.yml up -d postgres` |
| volume حذف شد | بازیابی از آرشیو (زیر) |

**نکته‌ی بازگشت کانتینر:** پروژه باید حتماً `-p janebi-store` باشد. بدون آن، Compose از پوشه‌ی `backups/` نام پروژه‌ی `backups` می‌گیرد و volume جدید و **خالی** `backups_janebi_pgdata` می‌سازد. قبل از `up` همیشه `docker volume ls` را بررسی کنید که فقط `janebi-store_janebi_pgdata` وجود داشته باشد.

**بازیابی آرشیو پس از حذف volume (روش پیشنهادی؛ قبل از اجرا نیاز به تست روی volume موقت):**
1. `docker volume create janebi-store_janebi_pgdata`
2. تعیین UID کاربر postgres در image: `docker run --rm --network none postgres:15-alpine id -u postgres` (انتظار: `70`).
3. استخراج آرشیو **فقط** روی این volume با mount فقط‌خواندنی برای آرشیو و `--network none`، سپس `chown -R 70:70` و `chmod 700` روی پوشه‌ی داده.
4. `docker compose -p janebi-store --project-directory /home/ubuntu/Janebi-Store up -d postgres` با فایل compose فعال و بررسی `docker compose … config` که نام volume همان `janebi-store_janebi_pgdata` باشد.
5. بررسی لاگ: `database system is ready to accept connections` و نبود `FATAL`/`PANIC`.

**ریسک‌های باز:** volume ساخته‌شده با `docker volume create` برچسب‌های Compose ندارد. قبل از استفاده در Production باید ثابت شود Compose آن را می‌پذیرد. این مورد فقط روی volume موقت تست شود.

بازگشت کد برنامه جداگانه است: `release.sh` هنگام انتشار، دستور rollback را چاپ می‌کند (`ln -sfn releases/<قبلی>/dist …`). آن دستور را بعد از هر انتشار ثبت کنید.

---

## ۸) موارد خارج از این runbook

- `.env` و secrets. fallback رمز در تاریخچه‌ی عمومی Git (`3b9ecff` روی `origin/main`) با حذف کانتینر و volume باطل **نمی‌شود**؛ چرخش رمز یا تصمیم مالک درباره‌ی تاریخچه، جدا است.
- نصب `vps-monitor.py` (بخشی از G2 است؛ مسیر تأییدشده‌ی آن جدا است).
- SQLite و داده‌های فروشگاه.
- تاریخچه‌ی Git (بازنویسی و force push انجام نمی‌شود).
- `deploy.sh` (مسیر انتشار مجاز `release.sh` است).
