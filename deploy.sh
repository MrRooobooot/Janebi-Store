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
  bun run build 2>&1 | tail -3
fi

# Step 2: Sync dist
echo "📤 Syncing dist/..."
rsync -avz -e "ssh $SSH_OPTS" --delete "$DIST_DIR/" "$REMOTE:$APP_DIR/dist/" 2>&1 | tail -3

# Step 3: Sync migrations and manifests
echo "📤 Syncing schema & config..."
rsync -avz -e "ssh $SSH_OPTS" --delete "$DRIZZLE_DIR/" "$REMOTE:$APP_DIR/drizzle/" 2>&1 | tail -3
rsync -avz -e "ssh $SSH_OPTS" ./package.json ./docker-compose*.yml "$REMOTE:$APP_DIR/" 2>&1 | tail -3

# Step 4: Restart container
CONTAINER_NAME="$([ "$IS_STAGING" = true ] && echo 'janebi-store-staging' || echo 'janebi-store')"
PORT="$([ "$IS_STAGING" = true ] && echo '3001' || echo '3000')"

echo "📦 Updating container $CONTAINER_NAME..."
ssh $SSH_OPTS "$REMOTE" "
  docker cp $APP_DIR/dist/server.cjs $CONTAINER_NAME:/app/dist/server.cjs
  docker cp $APP_DIR/dist/assets/. $CONTAINER_NAME:/app/dist/assets/
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
