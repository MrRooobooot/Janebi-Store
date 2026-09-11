#!/usr/bin/env python3
"""Apply self-hosted product images (phase 2 of the migration).

Reads migration-assets/queue.jsonl produced by migrate-product-images.py and
updates products.image to '/images/products/dk-<id>.<ext>'.

Dialect-aware: works against SQLite (DATABASE_URL=file path) AND PostgreSQL
(DATABASE_URL=postgres://) because the live store runs PG in the container.

Modes:
  default        --dry-run: print the planned UPDATEs, change nothing
  --apply        actually update the DB (single transaction)

Safety: refuses --apply unless every referenced file exists under
public/images/products/ (the script copies them there first from
migration-assets/).
"""
import argparse
import json
import os
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
QUEUE = ROOT / "migration-assets" / "queue.jsonl"
MIGRATED = ROOT / "migration-assets" / "products"
PUBLIC_DIR = ROOT / "public" / "images" / "products"

DB_URL = os.environ.get("DATABASE_URL", "data/janebi.db")
IS_PG = DB_URL.startswith("postgres://") or DB_URL.startswith("postgresql://")


def load_queue() -> list[dict]:
    rows = []
    with QUEUE.open() as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def stage_files(rows: list[dict]) -> list[str]:
    """Copy downloaded files into public/images/products/; return missing."""
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    missing = []
    for r in rows:
        src = MIGRATED / r["file"]
        if not src.exists():
            missing.append(r["file"])
            continue
        shutil.copy2(src, PUBLIC_DIR / r["file"])
    return missing


def apply_sqlite(rows: list[dict]) -> int:
    import sqlite3

    db_path = DB_URL if not DB_URL.startswith("./") else DB_URL[2:]
    conn = sqlite3.connect(ROOT / db_path)
    cur = conn.cursor()
    changed = 0
    try:
        for r in rows:
            cur.execute(
                "UPDATE products SET image=? WHERE id=? AND image LIKE 'http%digikala%'",
                (f"/images/products/{r['file']}", r["id"]),
            )
            changed += cur.rowcount
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return changed


def apply_pg(rows: list[dict]) -> int:
    import psycopg

    with psycopg.connect(DB_URL) as conn, conn.transaction():
        changed = 0
        with conn.cursor() as cur:
            for r in rows:
                cur.execute(
                    "UPDATE products SET image=%s WHERE id=%s AND image LIKE 'http%%digikala%%'",
                    (f"/images/products/{r['file']}", r["id"]),
                )
                changed += cur.rowcount
    return changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="actually update the DB (default: dry-run)")
    args = ap.parse_args()

    rows = load_queue()
    print(f"queue: {len(rows)} images")
    missing = stage_files(rows)
    if missing:
        print(f"ABORT: {len(missing)} files missing from migration-assets/: {missing[:5]}")
        return 1

    plan = [(r["id"], f"/images/products/{r['file']}") for r in rows]
    print(f"{'APPLY' if args.apply else 'DRY-RUN'}: {len(plan)} UPDATE products SET image=...")
    for pid, img in plan[:5]:
        print(f"  {pid} -> {img}")
    if len(plan) > 5:
        print(f"  ... and {len(plan) - 5} more")

    if not args.apply:
        print("dry-run complete — re-run with --apply to commit")
        return 0

    changed = apply_pg(rows) if IS_PG else apply_sqlite(rows)
    print(f"APPLIED: {changed} rows updated ({'PG' if IS_PG else 'SQLite'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
