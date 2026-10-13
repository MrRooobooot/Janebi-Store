#!/usr/bin/env bash
# Copy the git-tracked product photos (assets/product-photos) into the runtime folders.
#   scripts/ops/sync-product-photos.sh          → local public/images/products (gitignored)
#   scripts/ops/sync-product-photos.sh --vps    → also VPS public/images/products (served by the app)
#                                                  and dist/images/products (served by nginx root)
# Files are only copied in, never deleted, so admin uploads that live only in the runtime folder survive.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/assets/product-photos"
DST="$ROOT/public/images/products"

shopt -s nullglob
FILES=("$SRC"/*.webp)
[ "${#FILES[@]}" -gt 0 ] || { echo "no photos in $SRC" >&2; exit 1; }

mkdir -p "$DST"
cp -p "${FILES[@]}" "$DST/"
echo "local: ${#FILES[@]} photos → $DST"

if [ "${1:-}" = "--vps" ]; then
  tar -cf - -C "$SRC" $(cd "$SRC" && ls *.webp) | ssh janebi '
    set -e
    d=/home/ubuntu/Janebi-Store
    tmp=$(mktemp -d)
    tar -xf - -C "$tmp"
    mkdir -p "$d/public/images/products" "$d/dist/images/products"
    n=$(ls "$tmp"/*.webp | wc -l)
    cp -f "$tmp"/*.webp "$d/public/images/products/"
    cp -f "$tmp"/*.webp "$d/dist/images/products/"
    rm -rf "$tmp"
    echo "vps: $n photos synced to public and dist"
  '
fi
