#!/bin/bash
# audit-boot.sh — isolated admin audit server on :3978
cd ~/Desktop/Janebi-Store
kill $(lsof -tiTCP:3978 -sTCP:LISTEN) 2>/dev/null
export JWT_ACCESS_SECRET="audit-a…-0912"
export JWT_REFRESH_SECRET="audit-r…-0912"
node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:'usr-admin-aidin'},process.env.JWT_ACCESS_SECRET,{expiresIn:'1d'}))" > /tmp/audit-isolated/token.txt
T=$(cat /tmp/audit-isolated/token.txt)
PORT=3978 NODE_ENV=production DATABASE_URL=/tmp/audit-isolated/janebi.db DISABLE_CSP_UPGRADE_INSECURE=1 nohup node dist/server.cjs > /tmp/audit-isolated/server.log 2>&1 &
sleep 3
echo "stats: $(curl -s -H "Authorization: Bearer $T" http://127.0.0.1:3978/api/admin/stats | head -c 200)"
