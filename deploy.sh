#!/bin/bash
# deploy.sh — Deploy Janebi-Store from local dev to VPS using SSH Key Auth
# Usage: ./deploy.sh [--skip-build] [--staging]
set -e

REMOTE_HOST="${VPS_HOST:-45.82.137.67}"
REMOTE_USER="${VPS_USER:-ubuntu}"
REMOTE="$REMOTE_USER@$REMOTE_HOST"
APP_DIR="/home/ubuntu/Janebi-Store"
DIST_DIR="./dist"
DRIZZLE_DIR="./drizzle"

IS_STAGING=false
if [ "$1" == "--staging" ] || [ "$2" == "--staging" ]; then
  IS_STAGING=true
fi

echo "🚀 Janebi-Store Deploy (Target: $([ "$IS_STAGING" = true ] && echo 'STAGING' || echo 'PRODUCTION'))"

# SSH options (forcing key auth without password prompts)
SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

# Step 1: Build (unless --skip-build)
if [ "$1" != "--skip-build" ] && [ "$2" != "--skip-build" ]; then
  echo "🔨 Building..."
  if command -v bun &> /dev/null; then
    bun run build 2>&1 | tail -3
  else
    npm run build 2>&1 | tail -3
  fi
fi

# Step 2: Sync dist
echo "📤 Syncing dist/..."
rsync -avz -e "ssh $SSH_OPTS" --delete "$DIST_DIR/" "$REMOTE:$APP_DIR/dist/" 2>&1 | tail -3

# Step 3: Sync migrations and manifests
echo "📤 Syncing schema & config..."
rsync -avz -e "ssh $SSH_OPTS" --delete "$DRIZZLE_DIR/" "$REMOTE:$APP_DIR/drizzle/" 2>&1 | tail -3
rsync -avz -e "ssh $SSH_OPTS" ./package.json ./docker-compose*.yml "$REMOTE:$APP_DIR/" 2>&1 | tail -3
# Ship SMS_* config to VPS .env — MERGE-SAFE: never overwrite prod secrets.
# For each SMS_* key present locally, append it to the remote .env ONLY if the
# key is missing there. Existing remote lines (APP_URL, JWT secrets, Zarinpal
# keys, etc.) are never touched. The local .env itself is never copied over.
echo "🔐 Merging SMS_* env keys into remote .env (append-only)..."
LOCAL_ENV="$(pwd)/.env"
if [ -f "$LOCAL_ENV" ]; then
  ssh $SSH_OPTS "$REMOTE" "touch $APP_DIR/.env"
  grep -E '^(SMS_|# ?SMS_)' "$LOCAL_ENV" | grep -vE '^#\s*SMS_' | while IFS='=' read -r KEY VALUE; do
    [ -z "$KEY" ] && continue
    ssh $SSH_OPTS "$REMOTE" "grep -q '^${KEY}=' $APP_DIR/.env || printf '%s=%s\n' '$KEY' '$VALUE' >> $APP_DIR/.env"
  done
  echo "✅ SMS_* keys merged (existing remote values preserved)"
else
  echo "⚠️ No local .env found — skipping env merge"
fi

# Step 4: Restart container
CONTAINER_NAME="$([ "$IS_STAGING" = true ] && echo 'janebi-store-staging' || echo 'janebi-store')"
PORT="$([ "$IS_STAGING" = true ] && echo '3001' || echo '3000')"

echo "📦 Updating container $CONTAINER_NAME..."
ssh $SSH_OPTS "$REMOTE" "
  docker cp $APP_DIR/dist/server.cjs $CONTAINER_NAME:/app/dist/server.cjs
  docker cp $APP_DIR/dist/assets/. $CONTAINER_NAME:/app/dist/assets/
  docker exec $CONTAINER_NAME mkdir -p /app/drizzle/sqlite /app/drizzle/pg
  docker cp $APP_DIR/drizzle/sqlite/. $CONTAINER_NAME:/app/drizzle/sqlite/
  docker cp $APP_DIR/drizzle/pg/. $CONTAINER_NAME:/app/drizzle/pg/
  docker restart $CONTAINER_NAME 2>&1 | tail -1
  sleep 3
"

# Step 5: Health check
echo "🏥 Health check on port $PORT..."
ssh $SSH_OPTS "$REMOTE" "
  RESULT=\$(curl -sf http://localhost:$PORT/api/health 2>/dev/null || echo 'FAIL')
  echo \"Health: \$RESULT\"
  if echo \"\$RESULT\" | grep -q 'ok'; then
    echo '✅ Deploy OK'
  else
    echo '⚠️ Deploy Health Check Failed'
    exit 1
  fi
"

echo "✅ Deploy completed successfully."
