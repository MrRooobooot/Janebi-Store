#!/bin/bash
# Seed post 19 (rahnamaye-kabel-sharz-sari) into prod — proven pipeline
set -e
cd /Users/aidin/Desktop/Janebi-Store
if [ -f /tmp/janebi-deploy.lock ] && [ $(( $(date +%s) - $(stat -f %m /tmp/janebi-deploy.lock) )) -lt 600 ]; then
  echo "LOCK_ACTIVE skip"; exit 2
fi
touch /tmp/janebi-deploy.lock
trap 'rm -f /tmp/janebi-deploy.lock' EXIT

npx esbuild scripts/seed-blog.ts --bundle --platform=node --format=cjs \
  --external:better-sqlite3 --external:pg --outfile=/tmp/seed-blog.cjs
scp -o ConnectTimeout=15 /tmp/seed-blog.cjs ubuntu@45.82.137.67:/home/ubuntu/Janebi-Store/seed-blog.cjs
ssh ubuntu@45.82.137.67 "docker cp /home/ubuntu/Janebi-Store/seed-blog.cjs janebi-store:/app/seed-blog.cjs && docker exec -e SEED_BLOG_ONLY=rahnamaye-kabel-sharz-sari janebi-store node seed-blog.cjs && docker exec janebi-store rm -f /app/seed-blog.cjs && rm -f /home/ubuntu/Janebi-Store/seed-blog.cjs"
echo SEED_DONE
