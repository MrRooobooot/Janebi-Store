#!/usr/bin/env python3
# Novin Khodro QA round 11 live probes
import urllib.request, json, re

BASE = "http://185.231.183.51"
results = {}

def get(path):
    try:
        req = urllib.request.Request(BASE + path, headers={"User-Agent": "qa-round11"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        code = getattr(e, "code", None)
        return code if code else 0, str(e)

paths = ["index.html", "css/style.css", "css/installment.css", "css/responsive.css",
         "js/app.js", "js/cars-data.js", "sitemap.xml", "robots.txt", "llms.txt", ""]
bodies = {}
for p in paths:
    s, b = get("/" + p if p else "/")
    bodies[p if p else "/"] = b
    print(p or "/", "->", s)

html = bodies.get("index.html", "")
root = bodies.get("/", "")
print("phone 66120332 in index.html:", "66120332" in html)
print("canonical:", re.findall(r'<link[^>]*rel="canonical"[^>]*>', html))
print("novinkhodro.shop refs:", html.count("novinkhodro.shop"))
print("AutoDealer:", '"AutoDealer"' in html or '"@type": "AutoDealer"' in html or "@type\":\"AutoDealer" in html)
print("FAQPage:", "FAQPage" in html)
print("llms street:", "پلاک ۲۱" in bodies.get("llms.txt", ""))
print("llms phone:", "66120332" in bodies.get("llms.txt", ""))

# JSON-LD types
for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
    try:
        d = json.loads(m)
        g = d.get("@graph", [d])
        print("jsonld types:", [x.get("@type") for x in g if isinstance(x, dict)])
    except Exception as e:
        print("jsonld parse fail:", e)

# cars-data count
cars = bodies.get("js/cars-data.js", "")
ids = re.findall(r'id:\s*["\']?(car-\d+)', cars) or re.findall(r'id\s*:\s*["\']?([\w-]+)["\']?', cars)
print("car id tokens:", sorted(set(ids)))

# local file comparison
with open("/Users/aidin/Documents/Personal/Novin Khodro/index.html", encoding="utf-8") as f:
    local = f.read()
for marker in ["<title>", "og:image", "?v="]:
    lv = re.findall(marker.replace("<title>", r"<title>[^<]*</title>") if marker=="<title>" else (r'property="og:image"[^>]*' if marker=="og:image" else r'\?v=[\w.-]+'), local)
    hv = re.findall(marker.replace("<title>", r"<title>[^<]*</title>") if marker=="<title>" else (r'property="og:image"[^>]*' if marker=="og:image" else r'\?v=[\w.-]+'), html)
    print(f"marker {marker} local={lv} live={hv}")
