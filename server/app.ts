import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

import { errorHandler } from "./middleware/errorHandler.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { env, allowedOrigins } from "./env.js";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import brandsRoutes from "./routes/brands.js";
import couponsRoutes from "./routes/coupons.js";
import couponsActiveRoutes from "./routes/coupons-active.js";
import ordersRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import contactRoutes from "./routes/contact.js";
import paymentRoutes from "./routes/payment.js";
import settingsRoutes from "./routes/settings.js";
import reviewsRoutes from "./routes/reviews.js";
import blogRoutes from "./routes/blog.js";
import sitemapRoutes from "./routes/sitemap.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import { isPostgres, pool, sqlite } from "./db/index.js";
import { shouldNoIndex } from "./lib/robots.js";

export const app = express();

// Trust reverse proxy (Nginx)
app.set("trust proxy", 1);

// Reporting-Endpoints (modern report-to transport for CSP violations).
// SEC-H1: the endpoint host comes from config (env.APP_URL), never from
// request headers. It used to trust `X-Forwarded-Host`, which nginx forwards
// verbatim — so `X-Forwarded-Host: evil.example` both forged this header AND
// (because nginx caches /api/products etc. for 15s) poisoned the cached
// response every other visitor received, sending their CSP violation reports
// to an attacker-controlled origin.
app.use((req: any, res: any, next: any) => {
  // Permissions-Policy: deny powerful browser features the storefront never
  // uses (helmet v8 removed its permissionsPolicy middleware, set manually).
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=(self), usb=(), interest-cohort=()"
  );
  // Reporting-Endpoints — absolute URL, derived from the configured app URL.
  try {
    const base = new URL(env.APP_URL);
    const host = base.host;
    res.setHeader("Reporting-Endpoints", `csp-endpoint="${base.protocol}//${host}/api/csp-report"`);
  } catch {
    /* malformed APP_URL already rejected by env validation */
  }
  // X-Robots-Tag: explicit crawl directive for every response (incl. non-HTML
  // assets) — mirrors the index.html meta robots tag so crawlers never fall
  // back to an implied index/noarchive on stray endpoints.
  const pathLower = (req.path || "").toLowerCase();
  const hasSearch = typeof req.query?.search === 'string' && req.query.search.trim().length > 0;
  // One predicate for header + body (server/lib/robots.ts) — a header-only noindex
  // left the shell advertising index,follow on the same response.
  if (shouldNoIndex(pathLower, req.originalUrl?.split("?")[1]) || hasSearch) {
    res.setHeader("X-Robots-Tag", "noindex, follow");
  } else {
    res.setHeader("X-Robots-Tag", "index, follow");
  }
  next();
});

// Middleware - Request ID tracing — must run before everything else
app.use(requestIdMiddleware);

// Middleware - Security Headers with CSP
// SEC-03: `script-src` carries NO 'unsafe-inline'. The only executable inline
// script in the shipped shell is the anti-FOUC dark-mode bootstrap in
// index.html (ld+json blocks are inert under CSP and need no hash). Its exact
// bytes are hashed at boot and pinned as 'sha256-…'; rebuilding the shell
// recomputes the hash, and scripts/gate/csp-inline.sh fails the gate on any
// drift between the served HTML and the header.
const inlineScriptHashes = (() => {
  for (const candidate of ["dist/index.html", "index.html"]) {
    try {
      const html = fs.readFileSync(path.resolve(process.cwd(), candidate), "utf8");
      return [
        ...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/gi),
      ].map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);
    } catch {
      /* shell not built yet at this path — try the next candidate */
    }
  }
  return [];
})();

app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production"
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", ...inlineScriptHashes],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            // SEC-H3: no `http:` scheme source — every product/blog/static asset
            // is same-origin or https (audited: all 17 DB tables scanned for
            // http:// URLs → none). Allowing plain http let a MITM or a
            // compromised third-party origin swap a served image for a
            // tracking pixel / mixed-content beacon.
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.zarinpal.com", "https://payment.zarinpal.com", "https://sandbox.zarinpal.com", "https://generativelanguage.googleapis.com", "https://trustseal.enamad.ir"],
            // CSP violation observability: browsers POST violations here.
            // report-uri (legacy directive) is emitted only when CSP_REPORT_URI
            // is configured in the environment — no placeholder URL in code.
            // Modern report-to transport (Reporting-Endpoints header above)
            // stays active regardless.
            ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
            reportTo: ["csp-endpoint"],
            // Local smoke boots (http://127.0.0.1) MUST NOT emit
            // upgrade-insecure-requests: WebKit then rewrites every local
            // asset fetch to https://127.0.0.1 and fails them with TLS errors
            // (the whole sweep looks broken while prod is fine). Prod keeps it.
            // helmet: only `null` removes the directive ([]/false throw).
            ...(process.env.DISABLE_CSP_UPGRADE_INSECURE === "1" ? { upgradeInsecureRequests: null } : {}),
          },
        }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Middleware - Restricted CORS.
// SEC-H1: the allowlist is the ONLY authority. The old `isSameOrigin` helper
// compared Origin against the request's `X-Forwarded-Host`/`Host` header —
// nginx forwards `X-Forwarded-Host` verbatim, so `Origin: https://evil.example`
// + `X-Forwarded-Host: evil.example` earned a credentialed ACAO for ANY
// origin. Same-origin traffic is already covered by allowedOrigins (APP_URL).
app.use((req: any, res: any, next: any) => {
  cors({
    origin: (origin, cb) => {
      // Allow no-origin requests (mobile apps, curl), explicitly configured
      // origins, and everything outside production.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        env.NODE_ENV !== "production"
      ) {
        cb(null, true);
      } else {
        // SEC-H1: rejections answer WITHOUT CORS headers. `cb(new Error(...))`
        // routed through the error handler and returned HTTP 500 for every
        // cross-origin request, which also buried real 500s in the logs.
        cb(null, false);
      }
    },
    credentials: true,
    exposedHeaders: ["X-Request-ID", "X-Total-Count", "X-Total-Pages", "X-Current-Page"],
  })(req, res, next);
});

app.use(express.json());
app.use(
  pino(
    process.env.NODE_ENV !== "production" && env.NODE_ENV !== "production"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : {}
  )
);

// Rate limiting - General API
// 100 req/15min starved real browsing: a single catalogue session (product
// lists, cart, profile, wishlist) easily exceeds it. 600/15min (~40/min)
// still caps abuse while leaving normal shopping untouched.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// API responses default to no-store. Without an explicit Cache-Control Chromium
// heuristically cached a pre-write 200 and served it for the refetch that runs
// right after a POST (a submitted review / saved address only showed up after a
// manual reload). Endpoints that genuinely want caching override this below with
// their own res.setHeader("Cache-Control", ...).
app.use("/api/", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Rate limiting - Stricter Auth Endpoints (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // 5 attempts per window per IP
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  message: {
    message: "تعداد درخواست‌های بیش از حد مجاز. لطفاً یک دقیقه دیگر تلاش کنید.",
    error: "Too many authentication requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/otp/send", authLimiter);
app.use("/api/auth/otp/verify", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Rate limiting - Coupon validation (code brute-force protection).
// Mounted before the general /api/coupons router so the stricter window wins.
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // 10 validate attempts per window per IP
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  message: {
    message: "تعداد تلاش‌های بررسی کد تخفیف بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
    error: "Too many coupon validation requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/coupons/validate", couponLimiter);
app.use("/api/coupons", couponLimiter);

// Newsletter signup — public POST from the site footer. Stricter than the
// general limiter to stop list-bombing of the subscribers table.
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 subscribe attempts per IP per 15 minutes
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  message: {
    message: "تعداد درخواست‌های عضویت در خبرنامه بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
    error: "Too many newsletter requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/contact/newsletter", newsletterLimiter);

// R3-04: contact message submission — stricter than the general limiter to
// stop message-bombing of the contact_messages table.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 submissions per IP per 15 minutes
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  message: {
    message: "تعداد درخواست‌های ارسال پیام بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
    error: "Too many contact requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/contact", contactLimiter);

// R1-09: dedicated strict limiters on expensive/mutating storefront endpoints
// (order creation, payment gateway calls, token refresh) — abuse caps that the
// general 600/15min limiter is far too loose to provide.
const strictActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20/min per IP
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  message: {
    message: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه دیگر تلاش کنید.",
    error: "Too many requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/orders", strictActionLimiter);
app.use("/api/payment/request", strictActionLimiter);
app.use("/api/auth/refresh", strictActionLimiter);

// CSP violation reporting endpoint (§3.15 observability).
// Browsers POST violation reports (report-uri legacy shape or report-to
// report lists) here; they are logged via pino for security triage.
// Light rate limit — reports are low-value noise at high volume.
const cspReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: () => process.env.NODE_ENV === "test" || env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/csp-report", cspReportLimiter);
app.post(
  "/api/csp-report",
  // CSP report bodies arrive with non-JSON content types the global parser
  // skips (application/csp-report, application/reports+json).
  express.json({ type: () => true }),
  (req, res) => {
    const report = (req.body as any)?.["csp-report"] ?? req.body;
    req.log?.warn(
      { cspReport: report, requestId: req.id },
      "CSP violation report received"
    );
    res.status(204).end();
  }
);

// Routes
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/coupons-active", couponsActiveRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/upload", uploadRoutes);
app.use(sitemapRoutes); // GET /sitemap.xml — dynamic, includes blog_posts slugs

// RFC 9116 security.txt. express.static defaults to `dotfiles: "ignore"`, so the
// `/.well-known` segment (leading dot) would 404 through the dist mount — this
// explicit route is the only way it is served. dist/ first (vite copies
// public/ → dist/ at build), public/ as the dev/unbuilt fallback.
app.get("/.well-known/security.txt", (_req, res) => {
  for (const candidate of ["dist/.well-known/security.txt", "public/.well-known/security.txt"]) {
    const file = path.resolve(process.cwd(), candidate);
    // NOTE: res.sendFile() runs through `send`, whose default `dotfiles:"ignore"`
    // 404s any path containing a dot-directory — so read+send instead.
    if (fs.existsSync(file)) return res.type("text/plain").send(fs.readFileSync(file, "utf8"));
  }
  res.status(404).end();
});

// SEC-01: the production web root is `dist/` — the SAME dir esbuild writes
// `server.cjs` + `server.cjs.map` into. Without this, /server.cjs (compiled
// backend) and its full source map were publicly downloadable. One guard
// covers every static mount below (and index.ts's dist mount). `.cjs|.map`
// never legitimately appears in an /api path.
app.use((req, res, next) => (/\.(cjs|map)$/i.test(req.path) ? res.status(404).end() : next()));

// Static serving for uploaded assets (products, bale bot uploads)
app.use("/images", express.static(path.resolve(process.cwd(), "public", "images")));

// Health / readiness probe — verifies the process is up AND the database
// answers a real query. Uses the raw connection per dialect (pool for PG,
// better-sqlite3 handle otherwise) so it works on both deployments.
app.get("/api/health", async (req, res) => {
  const startedAt = Date.now();
  // SEC-H2: the detailed block (db size, memory, uptime, node version) is
  // operator telemetry that only helps an attacker fingerprint the runtime.
  // It is served to in-host probes (deploy health check + scripts/ops/vps-monitor.py
  // curl http://127.0.0.1:3000/api/health, which never traverse nginx, hence no
  // X-Forwarded-For) and stays hidden from public internet traffic.
  const viaProxy = Boolean(req.headers["x-forwarded-for"]);
  try {
    let dbSize: number | null = null;
    if (isPostgres) {
      await pool!.query("SELECT 1");
    } else {
      sqlite!.prepare("SELECT 1").get();
      try {
        const fs = await import("fs");
        const path = await import("path");
        const dbPath = path.resolve(process.cwd(), "data", "janebi.db");
        if (fs.existsSync(dbPath)) {
          dbSize = fs.statSync(dbPath).size;
        }
      } catch {
        // ignore size check failure
      }
    }

    const mem = process.memoryUsage();

    res.json({
      status: "ok",
      database: "ok",
      requestId: req.id,
      // SEC-H2: telemetry only for non-proxied (in-host) callers.
      ...(viaProxy
        ? {}
        : {
            latencyMs: Date.now() - startedAt,
            uptimeSeconds: Math.round(process.uptime()),
            databaseSizeBytes: dbSize,
            memory: {
              rssMb: Math.round(mem.rss / 1024 / 1024),
              heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
              heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
            },
            nodeVersion: process.version,
          }),
    });
  } catch (error: any) {
    console.error("Health check DB failure:", error?.message);
    res.status(503).json({
      status: "error",
      database: "unreachable",
      error: {
        code: "UNHEALTHY",
        message: "database unreachable",
        requestId: req.id || "unknown-request-id",
      },
    });
  }
});

// 404 catch-all — unmatched API routes get the standardized error envelope.
// Scoped to /api ONLY: non-API requests must fall through to the serving layer
// (vite middleware in dev, express.static + SPA fallback in server/index.ts).
app.use("/api", (req, res) => {
  res.status(404).json({
    status: "error",
    error: {
      code: "NOT_FOUND",
      message: `مسیر ${req.originalUrl} یافت نشد`,
      requestId: req.id || "unknown-request-id",
    },
    message: `مسیر ${req.originalUrl} یافت نشد`,
  });
});

// Global Error Handler
app.use(errorHandler);
