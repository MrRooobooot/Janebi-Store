# r40 — SSH outage, deploy blocked (2026-09-15)

- Gate: `npm run verify` PASS (tsc strict + vitest + build). Artifact audit: jsxDEV=0, /Users/=0.
- `git push`: "Everything up-to-date" (be76f19 + notes already on remote).
- Deploy `./deploy.sh`: FAILED — `ssh: connect to host 45.82.137.67 port 22: Connection refused` (2 quick retries + 20s later retry, same). Site itself healthy: /api/health ok, uptime ~28min.
- Live is still running pre-r39 bundle (index-CSVBhVv5.js); be76f19 (post-17 prerender + SEED_BLOG_ONLY) NOT deployed, post 17 Adaman NOT seeded (live /api/blog = 16 posts).
- Deploy lock honored: created, removed after failure. No docker actions run.
- NEXT ROUND: retry `./deploy.sh` first (SSH recovery), then seed post 17 via `SEED_BLOG_ONLY=<id>`, verify /api/blog=17 + curl BlogPosting prerender on /blog/brasresi-powerbank-baseus-adaman-20000-65w.
