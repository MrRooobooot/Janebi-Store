import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:1000} });
await page.goto('https://janebiarena.ir/brands', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(2000);
fs.writeFileSync('/tmp/brands-page.png', await page.screenshot({ fullPage: false }));
await browser.close();
console.log('saved');
