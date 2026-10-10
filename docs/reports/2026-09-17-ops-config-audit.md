# Production logs/config audit — 2026-09-17

Scope: SSH inspection of production, ordinary public GETs, local source/config review; followed by a limited filesystem-permission fix. Production `.env` changed 0644→0600 and backup directory 0775→0700. No restarts, deletion, payment requests, or application deployment. Evidence collected approximately 18:42–18:52 UTC. Repository HEAD and served `/BUILD_INFO`: `c25a69e` (`2026-09-17T00:04:12Z`). This is not an end-to-end checkout or load-test certification.

## Verified health

- `/api/health`: status=ok, database=ok. Public product API header `X-Total-Count: 38`.
- Current app container started `2026-09-17T00:04:31Z`; RestartCount=0, OOMKilled=false. PostgreSQL healthy, no published host ports; app uses SQLite via Compose override.
- Access logs, including rotated compressed files, parsed by quoted-request status boundary and timezone-aware timestamps. Window ending `2026-09-17T18:44:40Z`, preceding 24h: HTTP 200=851, 400=130, 301=2597, 404=1117, 304=36, 401=2, 206=1; 5xx=0. No unparsed records across scanned files. These are requests, not unique visitors. Static asset locations disable access logging.
- Earlier regex matching any standalone 5xx-like number incorrectly counted response byte lengths (e.g. HTTP 200 with 501 bytes). That provisional count is invalid.
- Current nginx error.log: zero bytes; rotated nginx error logs not fully audited. Current app log `--since 24h`: 2269 lines, 2236 JSON level=30 records; no error/fatal/warn/Gateway Rejected markers. Container history before recreation not represented by current docker logs.
- nginx syntax test successful. Four proxy locations overwrite X-Forwarded-For with remote_addr. Effective UFW enabled; fail2ban sshd active. TLS certificate expires 2026-11-13, certbot.timer and logrotate.timer active.
- JWT_ACCESS_SECRET and JWT_REFRESH_SECRET present, 64 characters each, distinct; no values recorded. JWT_SECRET is not the actual access-secret key. APP_URL=https://janebiarena.ir, NODE_ENV=production. SMS, primary payment, fallback payment and Bale configuration present (presence does not certify external service operation).
- Live/local SHA256 equality: docker-compose.yml, deploy/nginx-janebi-store.conf vs enabled nginx site, scripts/ops/vps-monitor.py, scripts/ops/backup-verify.sh.
- Latest scheduled backup `janebi-20260917-023001.db`: 643072 bytes; independently opened read-only: integrity_check=ok, foreign_key_check=0, products=38/users=3/orders=1. Cron log records uploaded=2; remote download/recovery and full application restore were NOT exercised.

## Confirmed defects / prioritized risks

### HIGH — readable secrets and customer backup files

Production `.env` and DB backups have mode 0644. Parent directories permit traversal. Readability checks as `www-data` returned exit 0 for both `.env` and latest DB backup, without printing their contents. This is local privilege-boundary exposure; not evidence of HTTP download or compromise.

Recommendation: restrict `.env` and private backup permissions/ownership; set restrictive backup umask; preserve required runtime owner access. Database exports contain customer/auth data: plaintext Bale upload should be reviewed and preferably encrypted before leaving the VPS. The earlier plain-HTTP `.env` check returned a redirect, not proof of HTTPS denial; do not equate HTTP routing with filesystem isolation.

### HIGH — active Docker log rotation missing

Both running containers: json-file driver with empty Config. App log ~43.6 MB; PostgreSQL log ~19.5 MB. Compose has no per-service logging block. `/etc/docker/daemon.json` contains max-size=10m/max-file=3 but was modified 2026-09-11; running Docker service ActiveEnterTimestamp=2026-09-05. Merely recreating app containers after editing an unapplied daemon configuration did not enforce rotation. Do not assume a Compose override caused this: no logging override exists in the current Compose file.

Recommendation: explicit bounded logging for both Compose services, then controlled recreate and inspect effective LogConfig. No daemon restart needed for that approach. Recreate requires planned runtime verification.

### MEDIUM — capacity pressure / cron logs unbounded

Root disk: 82% used, 4.0 GB free. containerd directory ~13 GB; Docker reports 12.35 GB build cache reclaimable. This is the dominant space consumer, not current log volume. No cache/volume deletion performed. App/Postgres lack memory limits; current available RAM ~1088 MB, no observed OOM.

nginx logs rotate daily with 14 retained rotations. `/home/ubuntu/backups/{cron,monitor,backup}.log` are absent from logrotate configuration. Monitor threshold=85%, therefore current 82% legitimately produces no disk alert. Add bounded retention for cron logs and deliberate build-cache housekeeping; do not remove volumes or live snapshot chains.

### MEDIUM — monitor can miss or delay incidents

`vps-monitor.py:135–140`: timestamp is sliced to 16 characters while cutoff has 17; date strings compared lexicographically, not chronologically. Confirmed local comparison: `'17/Sep/2026:18:4' < '17/Sep/2026:18:44'` is True, so an 18:49 record can be skipped despite being within the five-minute window. Month/day boundaries and timezone differences compound the defect.

`check_5xx` returns None on log-read failure, incorrectly treating missing evidence as healthy. Fatal-log check has the same pattern. Only the last 4000 access-log lines are scanned, limiting coverage during high traffic.

`main:209–211` sets last_alert even when bale_send returns False; subsequent runs can suppress retry for six hours. `bale_send` treats success to any chat as global success. `check_containers` reports lifetime nonzero RestartCount, not a delta as its docstring claims. Backup age accepts any nonempty *.db, not a manifest of successful verification/upload. These are source-confirmed control-flow findings; outages were not induced on prod.

### MEDIUM — backup failure handling overclaims success

`backup-verify.sh:113`: no successful off-box uploads invokes alert but does not exit nonzero; final output can still say backup OK with uploaded=0. Zero-products warning likewise continues. Curl calls have no total/connect timeouts; no overlap lock; fixed container temp filename. A hung upload can stall or overlap later cron runs. Env copy/chmod failure is not promoted to failure. Fresh backup-file age cannot prove upload success.

Seven-file retention is not seven-day coverage: several manual runs on one date occupy retained slots. One-off backups outside `janebi-20*.db` are not pruned. Latest backup is valid; these are future failure-path defects, not evidence of lost data today.

### ADVISORY — configuration hygiene

- SSH passwordauthentication=yes; root keys permitted, root password login prohibited. fail2ban sshd active (9629 historical failed attempts, not evidence of successful intrusion). Disable password auth only after verifying independent key access/recovery path.
- PostgreSQL password literal is committed in Compose; not reproduced here. PostgreSQL has no published ports and is not the application's active DB. Remove literal and coordinate actual DB credential rotation if retaining this service; environment editing alone does not rotate an initialized database password.
- Product API sends two Cache-Control headers: app max-age=30 and nginx max-age=15. Conflicting freshness directives should be unified; observed response 200, no reproduced data leak.
- App has no Docker healthcheck; cron provides polling, not automatic recovery from a responsive-process/unhealthy-app state.
- Host also runs mail daemons and Roundcube configuration; bound ports do not alone establish public reachability through firewall. Mail application/security lifecycle is outside this store-focused audit.

## Assessment correction

Earlier project summary repeated stale TASKS.md references to 138 test products and treated historical test counts as current proof. Current API/backup show 38 products; origin/quality of every product was not audited. No new full verify gate or browser checkout run occurred during this read-only audit. Production is responding; operational safeguards are incomplete. Avoid unqualified 'production ready' claims.

## Next implementation order (not executed)

1. Private file permissions and encrypted off-site backup policy.
2. Explicit Docker log caps plus cron log rotation; verify running configuration.
3. Fix timestamp parsing and alert delivery retry, backup exit/timeout/locking semantics; leave deterministic regression tests.
4. Controlled build-cache reclamation, documentation cleanup, credential hardening.
