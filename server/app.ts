import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';

import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';
import { env } from './env.js';

import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import brandsRoutes from './routes/brands.js';
import couponsRoutes from './routes/coupons.js';
import ordersRoutes from './routes/orders.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import contactRoutes from './routes/contact.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';

export const app = express();

// Trust reverse proxy (Nginx)
app.set('trust proxy', 1);

// 1. Request ID Generation & Propagation
app.use(requestIdMiddleware);

// 2. Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", ...env.allowedOrigins],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// 3. Strict CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, tests without origin)
    if (!origin) return callback(null, true);
    if (env.NODE_ENV !== 'production') return callback(null, true);
    if (env.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin '${origin}' is not allowed`));
  },
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'X-Total-Count', 'X-Total-Pages', 'X-Current-Page'],
}));

// 4. Request Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 5. Structured Logging via Pino with Zero-Leak Secret Redaction
app.use(pinoHttp({
  genReqId: (req) => (req as any).id,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.code',
      'req.body.refreshToken',
      'req.body.token',
      'req.body.authority',
      'req.body.apiKey',
      'req.body.merchantId',
      'res.headers["set-cookie"]'
    ],
    censor: '[REDACTED]',
  },
  level: env.NODE_ENV === 'test' ? 'silent' : (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test')
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    : undefined,
}));

// 6. Rate limiting on /api/
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test',
});
app.use('/api/', limiter);

// 7. API Domain Routes
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// 8. 404 Fallback for unmatched /api routes
app.use('/api', (req, res, next) => {
  next(new NotFoundError(`اندپوینت '${req.originalUrl}' یافت نشد`));
});

// 9. Global Centralized Error Handler
app.use(errorHandler);
