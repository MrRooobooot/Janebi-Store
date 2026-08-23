import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import rateLimit from "express-rate-limit";

import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./env.js";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import brandsRoutes from "./routes/brands.js";
import couponsRoutes from "./routes/coupons.js";
import ordersRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import contactRoutes from "./routes/contact.js";
import paymentRoutes from "./routes/payment.js";
import adminRoutes from "./routes/admin.js";

export const app = express();

// Trust reverse proxy (Nginx)
app.set("trust proxy", 1);

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
            connectSrc: ["'self'", "https://api.zarinpal.com", "https://generativelanguage.googleapis.com"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Middleware - Restricted CORS
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [env.APP_URL, "http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// Routes
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Global Error Handler
app.use(errorHandler);
