#!/usr/bin/env python3
"""Build docs/specs-backfill-plan.json — clean + extract, ZERO fabrication.
Every emitted feature is a verbatim token from the product's OWN title/description
(model, watt, length, material, compatibility). Digikala provenance stripped:
desc line «منبع استعلام…», DK- skus, dk- image filenames (rename on VPS is a
separate verified step). Category names normalized to the locked 14
(docs/CATEGORY-TREE.md SoT)."""
import json, re, unicodedata

d = json.load(open('/tmp/prod.json'))

# locked 14 + observed drift → normalized
CATMAP = {
    'قاب و کاور': 'قاب و کاور موبایل',
    'گلس': 'گلس و محافظ صفحه',
    'کابل': 'کابل و سیم',
    'شارژر': 'شارژر و آداپتور',
    'هولدر و پایه': 'هولدر و نگهدارنده',
    'محافظ کابل': 'گلس و محافظ صفحه',
}
LOCKED14 = {'قاب و کاور موبایل','گلس و محافظ صفحه','کابل و سیم','شارژر و آداپتور','هولدر و نگهدارنده','هندزفری و ایرباد','هدفون و هدست','پاوربانک','تبدیل و مبدل','لوازم گیمینگ موبایل','لوازم جانبی خودرو','لوازم جانبی ساعت هوشمند','محافظ و نگهدارنده','دانگل و تجهیزات اتصال'}

FA_NUM = '۰۱۲۳۴۵۶۷۸۹'
def fa(s): return ''.join(FA_NUM[int(c)] if c.isdigit() else c for c in str(s))

def to_en(s):
    return ''.join(str(FA_NUM.index(c)) if c in FA_NUM else c for c in s)

MODEL = re.compile(r'(?:مدل|model)\s*:?\s*([A-Za-z0-9][A-Za-z0-9\-./+%_ ]{1,24}?)(?=\s+(?:با|مناسب|به|طول|برای|،|،)|$)', re.I)
WATT = re.compile(r'(\d+(?:\.\d+)?)\s*(?:وات|W\b)', re.I)
MAH = re.compile(r'(\d{3,5})\s*(?:میلی[\u200c\-]?آمپر|mah)', re.I)
LEN = re.compile(r'طول\s*(\d+(?:[.,]\d+)?|یک|دو|سه)\s*متر')
LENMAP = {'یک': '۱', 'دو': '۲', 'سه': '۳'}
COMPAT = re.compile(r'مناسب برای\s+([^\n]{3,70})')
MAT = re.compile(r'(سیلیکون(?:ی)?|چرم(?:ی)?|TPU|پوست(?:ی)?|فلزی|شیشه(?:ای)?|نایلون(?:ی)?|بامبو(?:یی)?)', re.I)
CONNECTION = re.compile(r'(USB[\s\-]?C(?: به USB[\s\-]?C)?|Micro[\s\-]?USB(?: ?3)?(?: به USB[\s\-]?C)?|لایتنینگ|Lightning|USB به USB[\s\-]?C|USB به لایتنینگ|(?:USB|Type[\s\-]?C)\s+به\s+Type\s?C|3\.5\s*میلی)', re.I)
GLASSKIND = re.compile(r'(حریم شخصی|پرایوسی|Privacy|2\.5D|3D|اولئوفوبیک|اولهوفوبیک|تمپر|سرامیکی|ضدخش|آنتی‌استاتیک|Anti-Static)', re.I)
BT = re.compile(r'(بلوتوث\s*5\.\d|BT\s*5\.\d|وای[\s\-]?فای\s*6|Wi-?Fi\s*6|LTE|5G|4\.5G|4G)', re.I)
CAP = re.compile(r'(\d+(?:\.\d+)?)\s*(?:mAh|میلی[\u200c\-]?آمپر\s*ساعت|میلی[\u200c\-]?آمپرساعت)', re.I)
FASTCH = re.compile(r'(فست[\s\-]?شارژ|Fast[\s\-]?Charge|شارژ سریع|Quick Charge|QC\s?\d)', re.I)

def features_for(p):
    t = p['title'].strip()
    t_en = to_en(t)
    out = []
    m = MODEL.search(t)
    if m:
        model = m.group(1).strip(' -–.')
        if 2 <= len(model) <= 24:
            out.append(('مدل', model))
    m = WATT.search(t_en)
    if m: out.append(('توان', fa(m.group(1)) + ' وات'))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:mAh|میلی[\u200c\-]?آمپر\s*ساعت)', t_en)
    if m: out.append(('ظرفیت باتری', fa(m.group(1)) + ' میلی‌آمپر ساعت'))
    m = LEN.search(t)
    if m:
        v = LENMAP.get(m.group(1), m.group(1).replace(',', '.'))
        out.append(('طول', fa(v) + ' متر'))
    m = CONNECTION.search(t_en)
    if m: out.append(('رابط', m.group(1).replace('USB-C', 'USB-C')))
    m = COMPAT.search(t)
    if m:
        c = re.split(r'[،.\n]', m.group(1))[0].strip()
        c = re.sub(r'\s+', ' ', c)[:60]
        if len(c) >= 4: out.append(('سازگار با', c))
    m = MAT.search(t)
    if m: out.append(('جنس', m.group(1)))
    m = GLASSKIND.search(t)
    if m and 'گلس' in p['category'] + t: out.append(('نوع محافظ', m.group(1)))
    m = BT.search(t_en)
    if m: out.append(('اتصال', m.group(1)))
    m = FASTCH.search(t_en)
    if m: out.append(('شارژ سریع', 'پشتیبانی'))
    # dedupe by name,value
    seen = set(); ded = []
    for k, v in out:
        key = (k, v)
        if key not in seen:
            seen.add(key); ded.append({'name': k, 'value': v})
    return ded

BRAND_FIX = {'Baseus': 'بیسوس', 'Samsung': 'سامسونگ'}

plan = []
for p in d:
    title = re.sub(r'\s+', ' ', p['title']).strip()
    desc = (p.get('description') or '')
    lines = [ln for ln in desc.split('\n') if ln.strip() and 'دیجی' not in ln and 'digikala' not in ln.lower() and 'dkp-' not in ln and 'استعلام' not in ln]
    new_desc = '\n\n'.join(lines).strip()
    # CATEGORY-TREE.md is LOCKED: rename/merge/move needs explicit admin sign-off.
    # Taxonomy drift (e.g. 'هندزفری' vs 'هندزفری و ایرباد') is REPORTED, not rewritten here.
    cat = p['category']
    drift = cat not in LOCKED14
    feats = features_for({**p, 'title': title, 'category': cat})
    feat_strs = [f"{k}: {v}" for k, v in ((x['name'], x['value']) for x in feats)]
    img = p['image']
    new_img = re.sub(r'/images/products/dk-(\d+)\.jpg', r'/images/products/p-\1.jpg', img)
    sku_new = f"JB-{p['id']}"
    entry = {
        'id': p['id'],
        'title': title,
        'description': new_desc or None,
        'category': cat, 'cat_drift': drift,
        'features': feat_strs,
        'image': new_img if new_img != img else None,
        'sku': sku_new if (p.get('sku') or '').startswith('DK-') else None,
        'brand': BRAND_FIX.get(p.get('brand'), p.get('brand')),
        'renames': [(f"dk-{p['id']}.jpg", f"p-{p['id']}.jpg"), (f"dk-{p['id']}.avif", f"p-{p['id']}.avif")] if new_img != img else [],
    }
    plan.append(entry)

json.dump(plan, open('docs/specs-backfill-plan.json', 'w'), ensure_ascii=False, indent=1)
n_feat = sum(1 for e in plan if e['features'])
n_img = sum(1 for e in plan if e['image'])
n_desc = sum(1 for e in plan if e['description'] and 'دیجی' not in e['description'])
print(f"plan: {len(plan)} | with features: {n_feat} | img rename: {n_img}")
from collections import Counter
print('drift cats:', Counter(e['category'] for e in plan if e['cat_drift']))
print('desc still digikala?:', sum(1 for e in plan if e['description'] and 'دیجی' in e['description']))
print("sample 12:", json.dumps(plan[-100], ensure_ascii=False)[:400])
for e in plan:
    if e['id'] in (12, 5590, 5481, 5496):
        print(e['id'], '|', e['features'], '| sku:', e['sku'], '| img:', e['image'])
