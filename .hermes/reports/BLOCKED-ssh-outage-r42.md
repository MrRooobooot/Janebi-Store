# BLOCKED — SSH outage (r42, 2026-09-01 19:16 +0330)

- `ssh ubuntu@45.82.137.67 -p 22` → Connection refused (2 attempts, 5s apart).
- Contradictory signal: `nc -z` to port 22 succeeds (TCP accept) but sshd refuses — suggests fail2ban ban / MaxStartups drop / sshd degraded, NOT full network loss. HTTPS healthy (uptime 2486s, /api/health ok).
- Pending work on origin/main, NOT yet live: `be76f19` (blog post 17 + BlogPosting prerender; SEED_BLOG_ONLY flow). Live /api/blog = 16 posts.
- NEXT on SSH recovery: `touch /tmp/janebi-deploy.lock` → `./deploy.sh` → `SEED_BLOG_ONLY` seed post 17 in-container → verify /api/blog=17 + curl BlogPosting JSON-LD → `rm -f /tmp/janebi-deploy.lock`.
- If refused persists >3 rounds: escalate to user — needs VPS console access (provider panel / existing session) to restart sshd or clear fail2ban.
