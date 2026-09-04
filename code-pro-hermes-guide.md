# راهنمای پروفایل code-pro و هرمس

## پروفایل code-pro
- **نقش:** دستیار ارشد (Senior Architect).
- **وظیفه:** انجام هوشمندانه وظایف، اصلاحات خودکار (stage, commit, push)، دیپلوی (deploy) و تست زنده.
- **ویژگی‌ها:** بدون کد جایگزین (No Stubs)، رفع ریشه‌ای باگ‌ها (Root-Cause)، پاسخ‌های فوق‌مختصر (Terse) و ثبت مستندات در حافظه (Memory).
- **نحوه استفاده:** اجرای تسک‌های پیچیده، بررسی پروژه‌ها، توسعه Full-Stack، هماهنگی Subagentها و اصلاح UI/UX با تمرکز بر RTL/Persian.

## هرمس (Hermes Agent)
فریم‌ورک متن‌باز AI برای ترمینال، دسکتاپ و پلتفرم‌های پیام‌رسان.

### نصب و راه‌اندازی
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup
hermes doctor
```

### دستورات اصلی
```bash
hermes              # شروع چت تعاملی (TUI با display.interface: tui)
hermes chat -q "Q"  # اجرای یک پرسش سریع
hermes desktop      # اجرای نسخه دسکتاپ (GUI)
hermes dashboard    # اجرای پنل ادمین تحت وب
hermes proxy        # سرور پروکسی سازگار با OpenAI
```

### مسیرهای مهم (Key Paths)
- `~/.hermes/config.yaml`: تنظیمات (بدون رمز).
- `~/.hermes/.env`: کلیدهای API و Secretها.
- `~/.hermes/skills/`: اسکیل‌های نصب‌شده.
- `~/.hermes/state.db`: پایگاه‌داده سشن‌ها (SQLite).

### اجرای Subagentها
استفاده از `delegate_task` برای تسک‌های موازی، یا اجرای پراسس جدید `hermes` برای تسک‌های طولانی:
```bash
# تسک پس‌زمینه
hermes chat -q 'تسک...' &
```

> **توجه:** برای تغییر تنظیمات فقط از `hermes config set` استفاده کنید و از ویرایش دستی `config.yaml` بپرهیزید.
