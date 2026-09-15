import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:1000} });
await page.goto('http://localhost:3978/brands', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(2000);
fs.writeFileSync('/tmp/brands-page2.png', await page.screenshot());
await browser.close();
console.log('saved');
