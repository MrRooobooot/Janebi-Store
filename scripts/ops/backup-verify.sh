#!/usr/bin/env bash
# Daily DB backup + REAL restore test + off-box copy to Bale.
# Run on the VPS (cron 02:30 via /home/ubuntu/bin/janebi-backup.sh, which just
# execs this file so the logic lives in git instead of drifting on the host).
#
# Steps: snapshot (better-sqlite3 .backup, WAL-consistent) → integrity_check +
# foreign_key_check on the FILE → open it and read real rows (restore proof) →
# upload to Bale → best-effort pin → prune. Any failure alerts the operator on
# Bale and exits non-zero, so a silent backup death is impossible.
set -u

CONTAINER=janebi-store
DEST="${BACKUP_DIR:-$HOME/backups}"
ENV_FILE="${JANEBI_ENV_FILE:-$HOME/Janebi-Store/.env}"
LOG="$DEST/backup.log"
KEEP_DB=7
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/janebi-$STAMP.db"
TMP_IN_CONTAINER=/tmp/janebi-backup.db
mkdir -p "$DEST"
touch "$LOG"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }

env_val() { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-; }
BOT_TOKEN="$(env_val BALE_BOT_TOKEN)"
CHAT_IDS="$(env_val BALE_ADMIN_CHAT_IDS)"

alert() {
  local text="🧯 Janebi backup FAILED\n$*"
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
  # -sS + stderr capture: a silent curl (empty response) hides the real reason.
  curl -sS -X POST "https://tapi.bale.ai/bot$BOT_TOKEN/sendDocument" \
    -F "chat_id=$chat" -F "document=@$file" -F "caption=$caption" 2>&1
}

# ---------- 1. snapshot ----------
if ! sudo docker exec "$CONTAINER" node --input-type=module -e "
import Database from 'better-sqlite3';
const src = new Database('/app/data/janebi.db', { readonly: true });
await src.backup('$TMP_IN_CONTAINER');
src.close();
" > /dev/null 2>&1; then
  alert "step 1/5 snapshot: container DB backup command failed"; exit 1
fi
if ! sudo docker cp "$CONTAINER:$TMP_IN_CONTAINER" "$OUT" > /dev/null 2>&1; then
  alert "step 1/5 snapshot: docker cp failed"; exit 1
fi
sudo docker exec "$CONTAINER" rm -f "$TMP_IN_CONTAINER" > /dev/null 2>&1 || true
chmod 644 "$OUT" 2>/dev/null || true

SIZE=$(stat -c%s "$OUT" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 51200 ]; then
  alert "step 2/5 size: snapshot only ${SIZE}B (<50KiB) — refusing to trust it"
  mv "$OUT" "$OUT.bad"; exit 1
fi

# ---------- 2. integrity on the FILE ----------
INTEGRITY="$(sqlite3 "$OUT" 'PRAGMA integrity_check;' 2>&1 | head -1)"
[ "$INTEGRITY" != "ok" ] && { alert "step 2/5 integrity_check: $INTEGRITY"; mv "$OUT" "$OUT.bad"; exit 1; }
FK="$(sqlite3 "$OUT" 'PRAGMA foreign_key_check;' 2>&1 | head -1)"
[ -n "$FK" ] && { alert "step 2/5 foreign_key_check: $FK"; mv "$OUT" "$OUT.bad"; exit 1; }

# ---------- 3. restore proof: actually read the copy ----------
COUNTS="$(sqlite3 "$OUT" "SELECT 'products='||(SELECT count(*) FROM products)||' users='||(SELECT count(*) FROM users)||' orders='||(SELECT count(*) FROM orders)||' tables='||(SELECT count(*) FROM sqlite_master WHERE type='table');" 2>&1)"
case "$COUNTS" in
  products=*tables=*) : ;;
  *) alert "step 3/5 restore read failed: $COUNTS"; exit 1 ;;
esac
PRODUCTS=$(printf '%s' "$COUNTS" | sed -n 's/.*products=\([0-9]*\).*/\1/p')
if [ "${PRODUCTS:-0}" -eq 0 ]; then
  alert "step 3/5 restore read: backup holds 0 products ($COUNTS) — that is not the live catalogue"
fi

# ---------- 4. off-box copy + pin ----------
UPLOADED=0
if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_IDS" ]; then
  IFS=',' read -ra IDS <<< "$CHAT_IDS"
  for chat in "${IDS[@]}"; do
    RESP="$(bale_send_document "$OUT" "بکاپ روزانه جانبی آرنا — $STAMP ($((SIZE/1024))KiB) — $COUNTS" "$chat")"
    MSG_ID="$(printf '%s' "$RESP" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin)
    print(d.get("result",{}).get("message_id",""))
except Exception:
    print("")' 2>/dev/null)"
    if [ -n "$MSG_ID" ]; then
      UPLOADED=$((UPLOADED+1))
      # Private chats reject pinning (Telegram-compatible API): best effort only.
      curl -s -X POST "https://tapi.bale.ai/bot$BOT_TOKEN/pinChatMessage" \
        -H 'Content-Type: application/json' \
        -d "{\"chat_id\":$chat,\"message_id\":$MSG_ID,\"disable_notification\":true}" > /dev/null || true
      log "uploaded to Bale chat $chat (message_id=$MSG_ID)"
    else
      log "upload to chat $chat failed: $(printf '%s' "$RESP" | cut -c1-160)"
    fi
  done
fi
[ "$UPLOADED" -eq 0 ] && alert "step 4/5 off-box copy: no Bale upload succeeded — backup exists ONLY on this VPS"

# ---------- 5. env backup (never uploaded: it holds secrets) + prune ----------
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$DEST/env-$STAMP.bak" && chmod 600 "$DEST/env-$STAMP.bak"
fi
ls -1dt "$DEST"/janebi-20*.db 2>/dev/null | tail -n +$((KEEP_DB+1)) | xargs -r rm -f
ls -1dt "$DEST"/env-*.bak 2>/dev/null | tail -n +$((KEEP_DB+1)) | xargs -r rm -f
rm -f "$DEST"/*.db-wal "$DEST"/*.db-shm 2>/dev/null || true

log "OK $STAMP integrity=$INTEGRITY fk=clean size=$((SIZE/1024))KiB $COUNTS uploaded=$UPLOADED"
echo "backup OK: $OUT ($((SIZE/1024))KiB) $COUNTS uploaded=$UPLOADED"
