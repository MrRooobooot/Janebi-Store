import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/brands', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const cards = await page.evaluate(() => [...document.querySelectorAll('a[href*="brand="]')].map(a => a.textContent.replace(/\s+/g,' ').trim()).slice(0,15));
console.log('brand cards:', cards.length);
console.log(cards.join('\n').slice(0, 900));
// search filter test: انکر
await page.fill('input[type="text"], input[placeholder*="جستجو"]', 'انکر').catch(()=>{});
await page.waitForTimeout(800);
const visible = await page.evaluate(() => [...document.querySelectorAll('a[href*="brand="]')].filter(a => a.offsetParent !== null).length);
console.log('after search انکر visible:', visible);
await browser.close();
