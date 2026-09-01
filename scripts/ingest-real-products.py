#!/usr/bin/env python3
"""REAL product ingestion from Digikala public API (source evidence = product URL).
Queries per approved category keyword; extracts name/brand/model/price/URL as-is.
NO synthesis: only fields present in the API response are kept."""
import json, time, urllib.request, urllib.parse, os

OUT = "/Users/aidin/Desktop/Janebi-Store/.hermes/reports/ingest-products.jsonl"

# category keyword -> approved main category (14 locked)
QUERIES = [
    ("قاب گوشی", "قاب و کاور موبایل"),
    ("گلس محافظ صفحه", "گلس و محافظ صفحه"),
    ("کابل شارژ تایپ سی", "کابل و سیم"),
    ("شارژر دیواری", "شارژر و آداپتور"),
    ("هولدر گوشی موبایل", "هولدر و نگهدارنده"),
    ("هندزفری سیمی", "هندزفری و ایرباد"),
    ("ایرباد بلوتوث", "هندزفری و ایرباد"),
    ("هدفون بی سیم", "هدفون و هدست"),
    ("هدست گیمینگ", "هدفون و هدست"),
    ("پاوربانک", "پاوربانک"),
    ("تبدیل مبدل Type-C", "تبدیل و مبدل"),
    ("دسته بازی موبایل", "لوازم گیمینگ موبایل"),
    ("هولدر گوشی خودرو", "لوازم جانبی خودرو"),
    ("بند ساعت هوشمند", "لوازم جانبی ساعت هوشمند"),
    ("ساعت هوشمند", "لوازم جانبی ساعت هوشمند"),
    ("مودم همراه", "دانگل و تجهیزات اتصال"),
]

def fetch(q, page=1):
    url = f"https://api.digikala.com/v1/search/?q={urllib.parse.quote(q)}&page={page}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)

seen = {}
with open(OUT, "w") as f:
    for q, cat in QUERIES:
        try:
            d = fetch(q).get("data", {})
        except Exception as e:
            print("ERR", q, e); continue
        for p in (d.get("products") or [])[:8]:
            pid = p.get("id")
            if not pid or pid in seen: continue
            # brand from data_layer (real, as reported by source); else UNKNOWN
            brand = ((p.get("data_layer") or {}).get("brand")) or "UNKNOWN"
            if str(brand).strip().lower() in ("", "none"):
                brand = "UNKNOWN"
            # default variant price (real, IRR from API)
            price = ((p.get("default_variant") or {}).get("price") or {}).get("selling_price")
            uri = (p.get("url") or {}).get("uri") or f"/product/dkp-{pid}/"
            rec = {
                "dk_id": pid,
                "name": p.get("title_fa"),
                "name_en": p.get("title_en") or None,
                "brand": brand,
                "price_irr": price,
                "rating": p.get("rating"),
                "category_source": ((p.get("data_layer") or {}).get("category")),
                "category_target": cat,
                "query": q,
                "source_name": "Digikala",
                "source_url": f"https://www.digikala.com{uri}",
            }
            seen[pid] = rec
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        time.sleep(0.7)
print("total unique:", len(seen))
