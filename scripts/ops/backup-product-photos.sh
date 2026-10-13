#!/usr/bin/env bash
# Daily backup of runtime product photos (public/images/products) + off-box copy to Bale.
# Run on the VPS from /home/ubuntu/Janebi-Store/scripts/ops (cron 02:40, janebi-managed).
#
# The DB has its own backup (backup-verify.sh). Product photos had none: they exist only on
# the VPS disk, so a lost disk left product rows pointing at missing files.
#
# Steps: stage a copy + SHA256SUMS → tar.gz → extract the archive into a scratch dir and
# verify every checksum (restore proof) → upload to Bale → prune. Any failure alerts the
# operator on Bale and exits non-zero.
set -u

PHOTO_DIR="${PHOTO_DIR:-$HOME/Janebi-Store/public/images/products}"
DEST="${BACKUP_DIR:-$HOME/backups}"
ENV_FILE="${JANEBI_ENV_FILE:-$HOME/Janebi-Store/.env}"
LOG="$DEST/product-photos.log"
KEEP=7
MIN_FILES=50
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/product-photos-$STAMP.tar.gz"
mkdir -p "$DEST"
touch "$LOG"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }

env_val() { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-; }
BOT_TOKEN="$(env_val BALE_BOT_TOKEN)"
CHAT_IDS="$(env_val BALE_ADMIN_CHAT_IDS)"

alert() {
  local text="🧯 Janebi product-photo backup FAILED\n$*"
  log "ALERT $*"
  [ -z "$BOT_TOKEN" ] && { echo -e "$text"; return; }
  IFS=',' read -ra IDS <<< "$CHAT_IDS"
  for chat in "${IDS[@]}"; do
    # Bale returns 500 to parse_mode payloads — plain text only.
    curl -s -X POST "https://tapi.bale.ai/bot$BOT_TOKEN/sendMessage" \
      -H 'Content-Type: application/json' \
      -d "$(printf '{"chat_id":%s,"text":%s}' "$chat" "$(printf '%b' "$text" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')")" \
      > /dev/null || true
  done
  echo -e "$text"
}

bale_send_document() {
  local file="${1:-}" caption="${2:-}" chat="${3:-}"
  curl -sS -X POST "https://tapi.bale.ai/bot$BOT_TOKEN/sendDocument" \
    -F "chat_id=$chat" -F "document=@$file" -F "caption=$caption" 2>&1
}

STAGE="$(mktemp -d)"
RESTORE="$(mktemp -d)"
trap 'rm -rf "$STAGE" "$RESTORE"' EXIT

# ---------- 1. stage + archive ----------
[ -d "$PHOTO_DIR" ] || { alert "step 1/4: photo folder missing: $PHOTO_DIR"; exit 1; }
find "$PHOTO_DIR" -maxdepth 1 -type f -exec cp -p {} "$STAGE/" \;
N=$(find "$STAGE" -maxdepth 1 -type f | wc -l)
if [ "$N" -lt "$MIN_FILES" ]; then
  alert "step 1/4: only $N files in $PHOTO_DIR (<$MIN_FILES) — refusing to back up a near-empty folder"; exit 1
fi
(cd "$STAGE" && sha256sum -- * > SHA256SUMS) || { alert "step 1/4: checksum staging failed"; exit 1; }
tar -czf "$OUT" -C "$STAGE" . || { alert "step 1/4: tar failed"; exit 1; }
chmod 644 "$OUT"

# ---------- 2. restore proof: extract the archive and verify every checksum ----------
tar -xzf "$OUT" -C "$RESTORE" || { alert "step 2/4 restore: archive does not extract"; exit 1; }
RESTORED=$(find "$RESTORE" -maxdepth 1 -type f ! -name SHA256SUMS | wc -l)
[ "$RESTORED" -eq "$N" ] || { alert "step 2/4 restore: $RESTORED files in archive, expected $N"; exit 1; }
(cd "$RESTORE" && sha256sum -c SHA256SUMS --quiet) || { alert "step 2/4 restore: checksum mismatch"; exit 1; }

SIZE=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")

# ---------- 3. off-box copy ----------
UPLOADED=0
if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_IDS" ]; then
  IFS=',' read -ra IDS <<< "$CHAT_IDS"
  for chat in "${IDS[@]}"; do
    RESP="$(bale_send_document "$OUT" "بکاپ عکس‌های محصول جانبی آرنا — $STAMP ($N فایل، $((SIZE/1024))KiB)" "$chat")"
    MSG_ID="$(printf '%s' "$RESP" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin)
    print(d.get("result",{}).get("message_id",""))
except Exception:
    print("")' 2>/dev/null)"
    if [ -n "$MSG_ID" ]; then
      UPLOADED=$((UPLOADED+1))
      log "uploaded to Bale chat $chat (message_id=$MSG_ID)"
    else
      log "upload to chat $chat failed: $(printf '%s' "$RESP" | cut -c1-160)"
    fi
  done
fi
[ "$UPLOADED" -eq 0 ] && alert "step 3/4 off-box copy: no Bale upload succeeded — photo archive exists ONLY on this VPS"

# ---------- 4. prune ----------
ls -1t "$DEST"/product-photos-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f

log "OK $STAMP files=$N size=$((SIZE/1024))KiB restore=verified uploaded=$UPLOADED"
echo "photo backup OK: $OUT ($N files, $((SIZE/1024))KiB) restore=verified uploaded=$UPLOADED"
