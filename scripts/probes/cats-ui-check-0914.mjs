// UI check: home circles + /products sidebar must show 13 non-dupe cats
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/products', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const sidebar = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('کالا') || /^\d+$/.test(b.textContent.trim().split('\n').pop()));
  return [...document.querySelectorAll('aside button, button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()).filter(t => t && t.length < 40 && t.match(/[گلس|قاب|کابل|شارژر|هندز|هدفون|پاوربانک|هولدر|تبدیل|دانگل|لوازم|مبدل]/));
});
console.log('sidebar items:', [...new Set(sidebar)].join(' | '));
await browser.close();
