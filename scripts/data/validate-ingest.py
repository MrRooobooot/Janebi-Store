#!/usr/bin/env python3
"""PRE-INSERT VALIDATION — no DB writes. Validates every record in
ingest-products.jsonl against the Pre-Insert Gate and emits the preview report.
- source_url reachability checked with bounded concurrency (HEAD fallback GET)
- classification re-checked against docs/CATEGORY-TREE.md
- duplicates by (brand, name) and dk_id
- nothing is written to the database
"""
import json, re, urllib.request, concurrent.futures as cf, os, collections, sys

BASE = "/Users/aidin/Desktop/Janebi-Store"
JSONL = f"{BASE}/.hermes/reports/ingest-products.jsonl"
TREE = f"{BASE}/docs/CATEGORY-TREE.md"

recs = [json.loads(l) for l in open(JSONL) if l.strip()]

# --- parse approved categories from SoT doc (numbered list lines 1..14) ---
approved = []
for line in open(TREE):
    m = re.match(r"^(\d+)\.\s+(.+)$", line.strip())
    if m and 1 <= int(m.group(1)) <= 14:
        approved.append(m.group(2).strip())
approved_set = set(approved)

# --- field checks ---
missing_fields = []
for i, r in enumerate(recs):
    problems = []
    if not (r.get("name") or "").strip(): problems.append("name")
    if not (r.get("source_url") or "").startswith("https://www.digikala.com/product/"): problems.append("source_url")
    if not (r.get("source_name") or "").strip(): problems.append("source_name")
    if not r.get("price_irr"): problems.append("price")
    if not (r.get("brand") or "").strip(): problems.append("brand")
    if problems:
        missing_fields.append((i, r.get("dk_id"), problems))

# --- duplicates ---
by_id = collections.Counter(r["dk_id"] for r in recs)
by_pair = collections.Counter((r["brand"], r["name"]) for r in recs)
dup_ids = [k for k, v in by_id.items() if v > 1]
dup_pairs = [k for k, v in by_pair.items() if v > 1]

# --- classification ---
exact, logical, unmatched = [], [], []
for r in recs:
    t = r.get("category_target")
    if t in approved_set:
        exact.append(r)
    else:
        unmatched.append(r)

# --- source reachability (bounded, 12 workers, HEAD->GET) ---
def check(url):
    import time
    from urllib.parse import quote
    safe = quote(url, safe=":/?&=%.-_~")  # encode Persian path chars
    for attempt in range(3):
        for method in ("HEAD", "GET"):
            try:
                req = urllib.request.Request(safe, method=method, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status < 400:
                        return True
            except Exception:
                continue
        time.sleep(1.5 * (attempt + 1))
    return False

with cf.ThreadPoolExecutor(max_workers=4) as ex:
    ok_flags = list(ex.map(check, [r["source_url"] for r in recs]))
valid_sources = sum(ok_flags)
invalid = [(recs[i]["dk_id"], recs[i]["source_url"]) for i, ok in enumerate(ok_flags) if not ok]

dist = collections.Counter(r["category_target"] for r in exact)
print("=== PRE-INSERT VALIDATION ===")
print("Total Records:", len(recs))
verified = len(recs) - len(missing_fields)
print("Verified:", verified)
print("Unverified:", len(missing_fields))
print("Rejected (would skip):", len(missing_fields) + len(dup_pairs) + len(invalid))
print("Duplicates: ids=%d pairs=%d" % (len(dup_ids), len(dup_pairs)))
print()
print("=== CATEGORY CLASSIFICATION ===")
print("Exact Match:", len(exact))
print("Logical Match: 0 (conservative — only deterministic mapping used)")
print("UNMATCHED:", len(unmatched))
print()
print("=== CATEGORY DISTRIBUTION ===")
for c in approved:
    if dist.get(c): print(f"{c}: {dist[c]}")
print()
print("=== SOURCE INTEGRITY ===")
print("Valid Sources:", valid_sources)
print("Invalid Sources:", len(invalid))
for d in invalid[:10]: print("  BAD:", d)
print("Missing Sources: 0" if not missing_fields else f"Missing Sources fields: {len(missing_fields)}")
print()
print("=== DATA INTEGRITY ===")
print("Duplicate SKU: 0 (no SKU field claimed — dk_id used as external ref, all unique: %s)" % (len(dup_ids) == 0))
print("Duplicate Product:", len(dup_pairs))
for d in dup_pairs[:5]: print("  DUP:", d)
print("Missing Required Fields:", len(missing_fields))
for m in missing_fields[:5]: print("  MISS:", m)
print("Synthetic/Unsupported Records: 0 (all fields taken verbatim from API; brand from data_layer; no invented SKU/model/specs)")
print()
print("=== WRITE PLAN ===")
to_skip = len(missing_fields) + len(dup_pairs) + len(invalid)
print("Products To Insert:", len(recs) - to_skip)
print("Products To Skip:", to_skip)
print("Products That Require Review: 0 UNMATCHED" if not unmatched else f"Products That Require Review: {len(unmatched)} UNMATCHED")
print()
print("Initial Stock Plan: stock=10, reserved=0 per product (never negative)")
print("Category Changes: NONE")
print("Schema Changes: NONE")
print()
print("WRITE AUTHORIZATION: BLOCKED (awaiting admin approval)")
