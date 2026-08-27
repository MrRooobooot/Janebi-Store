#!/bin/bash
# deploy.sh — Deploy Janebi-Store from local dev to VPS
# Usage: ./deploy.sh [--skip-build]
set -e

REMOTE="ubuntu@45.82.137.67"
APP_DIR="/home/ubuntu/Janebi-Store"
DIST_DIR="./dist"
SERVER_DIR="./server"
DRIZZLE_DIR="./drizzle"

echo "🚀 Janebi-Store Deploy"

# Step 1: Build (unless --skip-build)
if [ "$1" != "--skip-build" ]; then
  echo "🔨 Building..."
  npm run build 2>&1 | tail -3
fi

# Step 2: Sync dist (frontend + server bundle)
echo "📤 Syncing dist/..."
rsync -avz --delete "$DIST_DIR/" "$REMOTE:$APP_DIR/dist/" 2>&1 | tail -3

# Step 3: Sync server source (for future docker builds)
echo "📤 Syncing server/ + drizzle/..."
rsync -avz --delete "$DRIZZLE_DIR/" "$REMOTE:$APP_DIR/drizzle/" 2>&1 | tail -3
rsync -avz ./package.json "$REMOTE:$APP_DIR/" 2>&1

# Step 4: Quick update via Docker copy (no rebuild needed)
echo "📦 Updating running container..."
ssh "$REMOTE" "
  docker cp $APP_DIR/dist/server.cjs janebi-store:/app/dist/server.cjs
  docker cp $APP_DIR/dist/assets/. janebi-store:/app/dist/assets/
  docker restart janebi-store 2>&1 | tail -1
  sleep 3
"

# Step 5: Health check
echo "🏥 Health check..."
ssh "$REMOTE" "
  RESULT=\$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo 'FAIL')
  echo \"Health: \$RESULT\"
  if echo \"\$RESULT\" | grep -q 'ok'; then
    echo '✅ Deploy OK'
  else
    echo '⚠️ Failed'
    exit 1
  fi
" 2>&1

echo "✅ Done in ~$SECONDS seconds"