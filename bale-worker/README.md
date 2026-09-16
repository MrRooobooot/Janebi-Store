# bale-worker/ — Cloudflare Worker variant of the Bale bot (UNSHIPPED)

Status: **not deployed, not imported by the app.** The live bot is the in-process
long-polling bot in `../server/bot/bale.ts` (started from `server/index.ts` with
`BALE_BOT_TOKEN`), which is what `@janebiarenabot` actually answers on.

This folder is the webhook-style alternative kept for reference: `src/worker.ts`
runs the same handler ideas on a Cloudflare Worker with its own `wrangler.toml`,
plus `src/worker.idempotency.test.ts`. It is excluded from the root tsconfig on
purpose, and it has its own toolchain:

```
npm install            # inside bale-worker/ (installs its own grammy + wrangler)
npm run dev            # wrangler dev --port 8788
npm run deploy         # wrangler deploy  ← publishes a worker; do not run casually
```

Rule: anything that ships to production must first be moved into
`server/bot/bale.ts` (and its modules), because that is the only path the
container actually runs. Local junk (`node_modules/`, `.wrangler/`) is
gitignored and can be deleted at any time; it is 260 MB.
