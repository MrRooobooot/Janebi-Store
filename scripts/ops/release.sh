#!/usr/bin/env bash
# Versioned, hash-verified, atomic Janebi release.
#
# Replaces the old in-place `rsync --delete` into the live docroot with:
#   0. local preconditions (clean worktree, dist/BUILD_INFO.release == HEAD, manifest self-check)
#   1. immutable release dir  releases/<sha>/{dist,drizzle}  (refuses to overwrite a shipped one)
#   2. remote verification: sha256sum -c manifest, identity, zero-byte guard, runtime-media union,
#      then RELEASE_SEAL (manifest hash of exactly the shipped tree)
#   3. additive migration applied in the RUNNING container (old code + new schema = no window
#      where new code runs against a missing column)
#   4. atomic switch: ./dist is repointed at releases/<sha>/dist with a single symlink rename,
#      previous tree preserved under releases/prev-<sha>-dist for rollback
#   5. app container recreated onto the new tree (bind mounts resolve at create time), then
#      live verification: served identity, 3-way server.cjs hash, F1/F3 markers, DB columns, health
#
# Nothing on the server is touched until every precondition passes.
set -euo pipefail

REMOTE="${REMOTE:-janebi}"
APP="${APP:-/home/ubuntu/Janebi-Store}"
CONTAINER="${CONTAINER:-janebi-store}"
HOST="${HOST:-https://janebiarena.ir}"
SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=15"
RSYNC_SSH="ssh $SSH_OPTS"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROBE="$ROOT/scripts/ops/probe-db.mjs"

step() { printf '\n=== %s ===\n' "$*"; }
die() { printf '\nABORT: %s\n' "$*" >&2; exit 1; }
rsh() { ssh $SSH_OPTS "$REMOTE" "$@"; }
wait_health() {
  local i code
  for i in $(seq 1 45); do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$HOST/api/health" || true)"
    [ "$code" = "200" ] && { echo "health 200 after $((i * 2))s"; return 0; }
    sleep 2
  done
  return 1
}

cd "$ROOT"
step "0. local preconditions"
[ -z "$(git status --porcelain)" ] || die "worktree not clean — commit or stash first"
HEAD_SHA="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short HEAD)"
[ -f dist/BUILD_INFO ] || die "dist/BUILD_INFO missing — run 'npm run build' (postbuild writes it)"
RELEASE_IN_DIST="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('dist/BUILD_INFO','utf8')).release)")"
[ "$RELEASE_IN_DIST" = "$HEAD_SHA" ] || die "stale build: dist/BUILD_INFO.release=$RELEASE_IN_DIST != HEAD=$HEAD_SHA — rebuild"
(cd dist && shasum -a 256 -c RELEASE_MANIFEST.sha256 > /dev/null) || die "local dist manifest self-check failed"
LOCAL_MANIFEST_HASH="$(shasum -a 256 dist/RELEASE_MANIFEST.sha256 | cut -d' ' -f1)"
LOCAL_SERVER_HASH="$(shasum -a 256 dist/server.cjs | cut -d' ' -f1)"
echo "release=$SHORT head=$HEAD_SHA build_files=$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('dist/BUILD_INFO','utf8')).build_files))")"
echo "local_server_cjs_sha256=$LOCAL_SERVER_HASH"

REL="$APP/releases/$SHORT"
step "1. stage immutable release $REL"
REMOTE_HASH="$(rsh "test -f $REL/dist/BUILD_INFO && sha256sum $REL/dist/BUILD_INFO | cut -d' ' -f1 || echo MISSING")"
if [ "$REMOTE_HASH" = "MISSING" ]; then
  rsh "mkdir -p $REL/dist $REL/drizzle"
  rsync -az -e "$RSYNC_SSH" --delete dist/ "$REMOTE:$REL/dist/" | tail -2
  rsync -az -e "$RSYNC_SSH" --delete drizzle/ "$REMOTE:$REL/drizzle/" | tail -2
  echo "uploaded $(rsh "find $REL -type f | wc -l") files"
else
  REMOTE_REL="$(rsh "node -e \"process.stdout.write(JSON.parse(require('fs').readFileSync('$REL/dist/BUILD_INFO','utf8')).release)\"")"
  [ "$REMOTE_REL" = "$HEAD_SHA" ] || die "release $SHORT already staged from a different commit ($REMOTE_REL) — pick a new commit or remove $REL deliberately"
  echo "already staged from the identical commit — reusing (immutability kept)"
fi

step "2. remote verification + runtime-media union + seal"
rsh "
set -e
R=$REL/dist
cd \$R
sha256sum -c --quiet RELEASE_MANIFEST.sha256 && echo MANIFEST_CHECK=OK
Z=\$(find . -type f -size -1c \\( -path './assets/*' -o -name 'server.cjs' -o -name 'index.html' -o -name 'sw.js' \\) | wc -l); echo ZERO_BYTE_ASSETS=\$Z; [ \"\$Z\" = 0 ] || exit 9
grep -o '\"release\":\"[^\"]*\"' BUILD_INFO; grep -o '\"built_at\":\"[^\"]*\"' BUILD_INFO; grep -o '\"dirty\":[a-z]*' BUILD_INFO
for d in products images; do
  if [ -d $APP/dist/\$d ]; then
    N=\$(rsync -a --ignore-existing $APP/dist/\$d/ \$R/\$d/ -i | wc -l)
    echo RUNTIME_UNION_\$d=\$N
  fi
done
find . -type f ! -name RELEASE_MANIFEST.sha256 ! -name RELEASE_SEAL -print0 | sort -z | xargs -0 sha256sum > RELEASE_MANIFEST.sha256
F=\$(find . -type f | wc -l)
printf '{\"release\":\"%s\",\"files\":%s,\"sealed_at\":\"%s\",\"manifest_sha256\":\"%s\"}\n' '$SHORT' \"\$F\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" \"\$(sha256sum RELEASE_MANIFEST.sha256 | cut -d' ' -f1)\" > RELEASE_SEAL
echo \"SEAL=\$(cat RELEASE_SEAL)\"
"

step "3. additive migration in the running container (old code + new schema)"
rsh "docker cp $REL/drizzle/sqlite/. $CONTAINER:/app/drizzle/sqlite/ >/dev/null && docker cp $REL/drizzle/pg/. $CONTAINER:/app/drizzle/pg/ >/dev/null && docker restart $CONTAINER >/dev/null && echo restarted"
wait_health || die "app did not come back healthy after the migration restart"
rsh "docker exec -i $CONTAINER node -" < "$PROBE" | tee /tmp/janebi_predeploy_db_probe.txt

step "4. atomic switch of ./dist + container recreate onto the new tree"
OLD_REL="$(rsh "cat $APP/dist/BUILD_INFO 2>/dev/null || echo '{}'" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const t=s.trim();try{process.stdout.write(JSON.parse(t).short||'unknown')}catch{process.stdout.write(t.split(/\s+/)[0]||'unknown')}})")"
echo "current_live_release=$OLD_REL"
rsh "cd $APP && if [ -L dist ]; then echo \"dist is already a symlink -> \$(readlink dist)\"; else mkdir -p releases && mv dist releases/prev-$OLD_REL-dist && echo \"previous tree kept at releases/prev-$OLD_REL-dist\"; fi && ln -sfn releases/$SHORT/dist .dist.next && mv -Tf .dist.next dist && echo \"dist -> \$(readlink dist)\""
T0="$(date +%s)"
rsh "cd $APP && docker compose up -d --force-recreate app 2>&1 | tail -3"
wait_health || die "app did not come back healthy after the recreate (rollback: see the printed command below)"
echo "app_restart_window=$(( $(date +%s) - T0 ))s"
rsh "docker cp $REL/drizzle/sqlite/. $CONTAINER:/app/drizzle/sqlite/ >/dev/null && docker cp $REL/drizzle/pg/. $CONTAINER:/app/drizzle/pg/ >/dev/null && echo drizzle_in_container_synced"

step "5. live verification"
echo "-- served identity:"
SERVED="$(curl -sS -m 15 "$HOST/BUILD_INFO")"
echo "$SERVED"
echo "$SERVED" | grep -q "$SHORT" || die "served BUILD_INFO does not carry $SHORT"
echo "-- three-way server.cjs hash (local build / release dir / live container):"
rsh "sha256sum $REL/dist/server.cjs $APP/dist/server.cjs | sed 's/^/  /' ; docker exec $CONTAINER sha256sum /app/dist/server.cjs | sed 's/^/  container: /'"
rsh "docker exec $CONTAINER sha256sum /app/dist/server.cjs | cut -d' ' -f1" | grep -q "^$LOCAL_SERVER_HASH$" || die "live container is NOT running the verified artifact"
echo "LOCAL_ARTIFACT_MATCH=OK"
echo "-- F1/F3 markers inside the live bundle:"
rsh "docker exec $CONTAINER sh -c \"grep -c 'PENDING:' /app/dist/server.cjs; grep -c 'payment_amount' /app/dist/server.cjs\"" | sed 's/^/  marker_lines=/'
echo "-- live DB columns + state:"
rsh "docker exec -i $CONTAINER node -" < "$PROBE"
echo "-- http smoke:"
for p in / /api/health /api/products /sitemap.xml /manifest.webmanifest; do
  printf '  %-22s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$HOST$p")"
done

printf '\n=== RELEASE %s LIVE ===\n' "$SHORT"
printf 'rollback: ssh %s "cd %s && ln -sfn releases/prev-%s-dist .dist.next && mv -Tf .dist.next dist && docker compose up -d --force-recreate app"\n' "$REMOTE" "$APP" "$OLD_REL"
printf 'identity: curl -s %s/BUILD_INFO\n' "$HOST"
