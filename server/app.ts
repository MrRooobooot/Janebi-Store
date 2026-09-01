import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import rateLimit from "express-rate-limit";

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
import adminRoutes from "./routes/admin.js";
import { isPostgres, pool, sqlite } from "./db/index.js";

export const app = express();

// Trust reverse proxy (Nginx)
app.set("trust proxy", 1);

// Reporting-Endpoints (modern report-to transport for CSP violations).
// Absolute URL per request, derived from the forwarded Host header, so it
// works behind the production reverse proxy without hardcoding the domain.
app.use((req: any, res: any, next: any) => {
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  // Permissions-Policy: deny powerful browser features the storefront never
  // uses (helmet v8 removed its permissionsPolicy middleware, set manually).
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=(self), usb=(), interest-cohort=()"
  );
  // Reporting-Endpoints (modern report-to transport for CSP violations).
  // Absolute URL per request, derived from the forwarded Host header, so it
  // works behind the production reverse proxy without hardcoding the domain.
  if (host) {
    res.setHeader("Reporting-Endpoints", `csp-endpoint="${proto}://${host}/api/csp-report"`);
  }
  next();
});

// Middleware - Request ID tracing — must run before everything else
app.use(requestIdMiddleware);

// Middleware - Security Headers with CSP
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production"
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://api.zarinpal.com", "https://payment.zarinpal.com", "https://sandbox.zarinpal.com", "https://generativelanguage.googleapis.com"],
            // CSP violation observability: browsers POST violations here.
            // report-uri (legacy directive) is emitted only when CSP_REPORT_URI
            // is configured in the environment — no placeholder URL in code.
            // Modern report-to transport (Reporting-Endpoints header above)
            // stays active regardless.
            ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
            reportTo: ["csp-endpoint"],
          },
        }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Middleware - Restricted CORS.
// Same-origin requests (Origin equals the site's own scheme+host, derived from
// the forwarded Host header) are ALWAYS allowed — blocking them breaks ES
// module scripts, which send Origin even for same-origin loads.
function isSameOrigin(origin: string | undefined, req: { headers: Record<string, any> }): boolean {
  if (!origin) return false;
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
  if (!host) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

app.use((req: any, res: any, next: any) => {
  cors({
    origin: (origin, cb) => {
      // Allow no-origin requests (mobile apps, curl), same-origin module loads,
      // explicitly configured origins, and everything outside production.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isSameOrigin(origin, req) ||
        env.NODE_ENV !== "production"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["X-Request-ID"],
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

// Health / readiness probe — verifies the process is up AND the database
// answers a real query. Uses the raw connection per dialect (pool for PG,
// better-sqlite3 handle otherwise) so it works on both deployments.
app.get("/api/health", async (req, res) => {
  const startedAt = Date.now();
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
      latencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      databaseSizeBytes: dbSize,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      nodeVersion: process.version,
      requestId: req.id,
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
