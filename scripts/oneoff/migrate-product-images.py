#!/usr/bin/env python3
"""Self-host Digikala-hotlinked product images.

Phase 1 (this script): fetch product list from the live API, HEAD-check every
hotlinked image, download the ORIGINAL (query stripped) into
migration-assets/products/dk-<id>.<ext> with magic-byte + size verification.
WAF-safe: <=4 workers, exponential backoff on 429/403, real browser UA.

Does NOT touch the DB or public/ — the update is a separate, explicit step
(scripts/apply-product-images.py, default --dry-run).
"""
import argparse
import concurrent.futures as cf
import json
import pathlib
import sys
import time
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "migration-assets" / "products"
QUEUE = ROOT / "migration-assets" / "queue.jsonl"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
MAGIC = {
    b"\xff\xd8": "jpg",
    b"\x89P": "png",
    b"RIFF": "webp",  # refined below (RIFF....WEBP)
}


def fetch(url: str, timeout: int = 20) -> tuple[int, bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.digikala.com/"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(), r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return e.code, b"", ""
    except Exception as e:  # noqa: BLE001
        return -1, b"", str(e)[:60]


def sniff(buf: bytes) -> str | None:
    if buf.startswith(b"\xff\xd8"):
        return "jpg"
    if buf.startswith(b"\x89PNG"):
        return "png"
    if buf[:4] == b"RIFF" and buf[8:12] == b"WEBP":
        return "webp"
    return None


def fetch_one(item: dict, retries: int) -> dict:
    pid, url = item["id"], item["url"]
    delay = 2.0
    for attempt in range(1, retries + 1):
        status, buf, ctype = fetch(url)
        if status == 200 and buf:
            kind = sniff(buf)
            if kind and len(buf) >= 5 * 1024:
                ext = "jpg" if kind == "jpg" else ("png" if kind == "png" else "webp")
                target = OUT_DIR / f"dk-{pid}.{ext}"
                target.write_bytes(buf)
                return {"id": pid, "ok": True, "file": target.name, "bytes": len(buf)}
            return {"id": pid, "ok": False, "reason": f"bad content ({ctype or 'unknown'}, {len(buf)}B)"}
        if status in (429, 403) and attempt < retries:
            time.sleep(delay)
            delay *= 2  # exponential backoff
            continue
        return {"id": pid, "ok": False, "reason": f"HTTP {status}"}
    return {"id": pid, "ok": False, "reason": "exhausted"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="cap number of images (0 = all)")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--retries", type=int, default=3)
    args = ap.parse_args()

    status, body, _ = fetch("https://janebiarena.ir/api/products?limit=1000")
    if status != 200:
        print(f"FAILED to read product list: HTTP {status}")
        return 1
    products = json.loads(body)
    hot = []
    for p in products:
        img = p.get("image") or ""
        if img.startswith("http") and "digikala" in img:
            base = img.split("?", 1)[0]  # original size, strip x-oss-process
            hot.append({"id": p["id"], "url": base})
    if args.limit:
        hot = hot[: args.limit]
    print(f"products={len(products)} hotlinked={len(hot)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results, failed = [], []
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        for res in ex.map(lambda it: fetch_one(it, args.retries), hot):
            results.append(res)
            if not res["ok"]:
                failed.append(res)
            if len(results) % 25 == 0:
                done_mb = sum(r.get("bytes", 0) for r in results) / 1e6
                print(f"  {len(results)}/{len(hot)} ok={sum(1 for r in results if r['ok'])} {done_mb:.1f}MB {time.time()-t0:.0f}s")

    ok = [r for r in results if r["ok"]]
    total = sum(r["bytes"] for r in ok)
    report = {
        "fetched_ok": len(ok),
        "fetch_failed": failed,
        "total_size_mb": round(total / 1e6, 2),
        "est_full_size_mb": round(total / max(len(ok), 1) * len(hot) / 1e6, 2),
        "sample_failed": failed[:5],
        "ready_for_apply": len(ok),
    }
    (ROOT / ".hermes" / "team" / "round8-assets.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    with QUEUE.open("w") as f:
        for r in ok:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(json.dumps({k: report[k] for k in ("fetched_ok", "fetch_failed", "total_size_mb", "est_full_size_mb")}, ensure_ascii=False)[:300])
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
