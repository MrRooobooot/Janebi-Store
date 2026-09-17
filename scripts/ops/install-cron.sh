#!/usr/bin/env bash
# Install/refresh the VPS cron wiring from the repo (idempotent).
# Run on the VPS after any change to scripts/ops/*: bash scripts/ops/install-cron.sh
#
# Why this file exists: the cron entries live on the host and are NOT in git, so
# moving a script path silently killed monitoring once (cron kept calling
# scripts/vps-monitor.py after it became scripts/ops/vps-monitor.py). The
# installer rewrites the whole managed block every run, so the host can never
# drift from the repo again.
set -euo pipefail

REPO="${JANEBI_REPO:-$HOME/Janebi-Store}"
MARK="# janebi-managed"
BACKUP_SCRIPT="$REPO/scripts/ops/backup-verify.sh"
MONITOR_SCRIPT="$REPO/scripts/ops/vps-monitor.py"
BACKUP_CMD="$BACKUP_SCRIPT"
MONITOR_CMD="python3 $MONITOR_SCRIPT"

for f in "$BACKUP_SCRIPT" "$MONITOR_SCRIPT"; do
  [ -f "$f" ] || { echo "missing $f — is the repo synced to the VPS?"; exit 1; }
done
chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true

CURRENT="$(crontab -l 2>/dev/null || true)"
KEPT="$(printf '%s\n' "$CURRENT" | grep -v -e "$MARK" -e 'janebi-backup.sh' -e 'scripts/vps-monitor.py' -e 'scripts/ops/vps-monitor.py' -e 'scripts/ops/backup-verify.sh' || true)"

{
  printf '%s\n' "$KEPT" | sed '/^$/d'
  echo "$MARK daily DB backup + restore test + Bale upload"
  echo "30 2 * * * $BACKUP_CMD >> $HOME/backups/cron.log 2>&1 $MARK"
  echo "$MARK health / containers / disk / 5xx / backup-age monitor (alerts to Bale)"
  echo "*/5 * * * * $MONITOR_CMD >> $HOME/backups/monitor.log 2>&1 $MARK"
} > /tmp/janebi-crontab.new

crontab /tmp/janebi-crontab.new
rm -f /tmp/janebi-crontab.new
echo "installed crontab:"
crontab -l | grep -E "janebi|vps-monitor" || true

# keep the legacy wrapper path working for anyone/anything that still calls it
mkdir -p "$HOME/bin"
cat > "$HOME/bin/janebi-backup.sh" <<EOF
#!/bin/bash
# Legacy wrapper — logic lives in $BACKUP_CMD (versioned in git).
exec "$BACKUP_CMD"
EOF
chmod +x "$HOME/bin/janebi-backup.sh"
echo "legacy wrapper refreshed: $HOME/bin/janebi-backup.sh"
