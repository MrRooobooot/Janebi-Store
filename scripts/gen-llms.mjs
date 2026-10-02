#!/usr/bin/env node
// Regenerates public/llms.txt and public/llms-full.txt from the live store API.
// Usage: node scripts/gen-llms.mjs                        (defaults to prod)
//        STORE_BASE_URL=http://localhost:3000 node scripts/gen-llms.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.STORE_BASE_URL || 'https://janebiarena.ir').replace(/\/+$/, '');
const OUT = path.resolve(process.cwd(), 'public');

const fa = (v) => String(v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]).replace(/,/g, '٬');
const oneLine = (s) => String(s || '').replace(/\s*\n+\s*/g, ' ').trim();
const toman = (n) => `${fa(Number(n).toLocaleString('en-US'))} تومان`;

async function get(p) {
  const res = await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GET ${p} -> HTTP ${res.status}`);
  return res.json();
}

const [products, categories, brands] = await Promise.all([
  get('/api/products?limit=500'),
  get('/api/categories'),
  get('/api/brands'),
]);

if (!Array.isArray(products) || products.length === 0) {
  throw new Error('empty product feed — refusing to overwrite docs with nothing');
}
const catSum = categories.reduce((a, c) => a + (c.count || 0), 0);
if (catSum !== products.length) {
  console.warn(`[gen-llms] WARN category counts (${catSum}) != products (${products.length})`);
}

const prices = products.map((p) => Number(p.price) || 0).filter((n) => n > 0);
const range = prices.length ? `${toman(Math.min(...prices))} تا ${toman(Math.max(...prices))}` : '—';
const today = new Date().toISOString().slice(0, 10);
const discounted = products.filter((p) => Number(p.discount) > 0).length;

const brandLine = brands
  .map((b) => `${b.faName || b.name} (${fa(b.count)} محصول)`)
  .join('، ');

const catUrl = (title) => `${BASE}/products?category=${encodeURIComponent(title)}`;

const catBlocks = categories
  .map((c) => {
    const samples = products
      .filter((p) => p.category === c.title)
      .slice(0, 3)
      .map((p) => `  - ${oneLine(p.title)} — ${toman(p.price)}`)
      .join('\n');
    return `- **${c.title} (${fa(c.count)} محصول)**: ${catUrl(c.title)}\n${samples}`;
  })
  .join('\n');

const llms = `# Janebi Arena (جانبی آرنا) — مرجع تخصصی لوازم جانبی موبایل

> جانبی آرنا فروشگاه تخصصی آنلاین و مرجع تأمین لوازم جانبی اصل گوشی‌های هوشمند (اپل، سامسونگ، شیائومی و برندهای جانبی معتبر) در ایران است. تمام آمار این سند از API زنده فروشگاه استخراج می‌شود و با هر تغییر کاتالوگ به‌روز می‌شود.

## اطلاعات کلیدی فروشگاه (Store Metadata)
- **نام برند**: جانبی آرنا (Janebi Arena)
- **وبسایت رسمی**: https://janebiarena.ir
- **حوزه فعالیت**: فروش تخصصی لوازم جانبی موبایل — هولدر و پایه، کابل و شارژر، محافظ صفحه و کاور
- **تضمین‌ها**: ۷ روز ضمانت بازگشت وجه، ضمانت اصالت و سلامت فیزیکی کالا، ارسال سریع به سراسر ایران
- **کد شامد / نماد اعتماد الکترونیکی (اینماد)**: ۴۱۵۴۳۳۸۹ (شناسه ۷۱۵۲۱۱۹)
- **شماره پشتیبانی**: ۰۲۱-۸۸۸۸۹۹۹۹
- **آدرس**: تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴
- **ساعت پاسخگویی**: همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰

## آمار کاتالوگ (Live Catalog Stats — از API زنده، ${today})
- **تعداد محصولات فعال**: ${fa(products.length)}
- **تعداد دسته‌بندی‌ها**: ${fa(categories.length)}
- **برندها**: ${brandLine}
- **محدوده قیمت**: ${range}

## دسته‌بندی‌های اصلی محصولات (Product Categories — لینک‌های واقعی)
${catBlocks}

## سیاست‌ها (Policies)
- **ارسال رایگان**: برای سفارش‌های ۲٬۰۰۰٬۰۰۰ تومان به بالا
- **هزینه ارسال**: پست سفارشی ۳۵٬۰۰۰ و پیشتاز ۵۰٬۰۰۰ تومان — نهایی در صفحه پرداخت
- **بازگشت کالا**: ۷ روز مهلت تست، ضمانت اصالت و سلامت فیزیکی
- **پرداخت**: درگاه امن زرین‌پال (کارت‌های شتاب)

## برای عامل‌های هوش مصنوعی (For AI Agents)
- فهرست زنده محصولات: \`GET https://janebiarena.ir/api/products\` (پارامترها: \`category\`, \`brand\`, \`search\`, \`minPrice\`, \`maxPrice\`, \`inStock\`, \`hasDiscount\`, \`sort\`, \`page\`)
- فهرست دسته‌بندی‌ها: \`GET https://janebiarena.ir/api/categories\`
- فهرست برندها با تعداد واقعی محصولات: \`GET https://janebiarena.ir/api/brands\`
- جزئیات محصول: \`GET https://janebiarena.ir/api/products/:id\`
- نظرات خریداران: \`GET https://janebiarena.ir/api/products/:id/reviews\`
- کاتالوگ کامل متنی: https://janebiarena.ir/llms-full.txt
- قیمت‌گذاری و سیاست‌ها: https://janebiarena.ir/pricing.md
`;

const byCat = new Map();
for (const c of categories) byCat.set(c.title, []);
const leftover = [];
for (const p of products) (byCat.get(p.category) || leftover).push(p);

const fullBlocks = categories
  .map((c) => {
    const items = (byCat.get(c.title) || []).map(productBlock).join('\n');
    return `## دسته‌بندی: ${c.title}\n${items}`;
  })
  .join('\n');

function productBlock(p) {
  const lines = [
    `- **${oneLine(p.title)}**`,
    `  - برند: ${oneLine(p.brand) || '—'}`,
    `  - گارانتی: ${oneLine(p.warranty) || '—'}`,
    `  - توضیحات: ${oneLine(p.description)}`,
  ];
  if (Array.isArray(p.features) && p.features.length) {
    lines.push(`  - ویژگی‌ها: ${p.features.map(oneLine).join('، ')}`);
  }
  lines.push(`  - قیمت: ${toman(p.price)}`);
  if (Number(p.discount) > 0) lines.push(`  - تخفیف: ${fa(p.discount)}٪`);
  lines.push(`  - موجودی: ${(p.stockQuantity ?? 0) > 0 ? 'موجود' : 'ناموجود'}`);
  lines.push(`  - آدرس: ${BASE}/product/${p.id}`);
  return lines.join('\n');
}

let llmsFull = `# Janebi Arena — Full Product Catalog (کاتالوگ کامل محصولات)

> تولیدشده از API زنده (GET /api/products) — ${today}. قیمت‌ها به تومان. لینک‌ها واقعی.
> این فایل با \`node scripts/gen-llms.mjs\` بازتولید می‌شود؛ دستی ویرایش نکنید.

${fullBlocks}
`;
if (leftover.length) {
  llmsFull += `\n## دسته‌بندی: سایر\n${leftover.map(productBlock).join('\n')}\n`;
}

fs.writeFileSync(path.join(OUT, 'llms.txt'), llms, 'utf8');
fs.writeFileSync(path.join(OUT, 'llms-full.txt'), llmsFull, 'utf8');

console.log(
  `[gen-llms] wrote llms.txt + llms-full.txt — products=${products.length} categories=${categories.length} brands=${brands.length} discounted=${discounted} from ${BASE}`
);
