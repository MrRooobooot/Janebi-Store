/**
 * Admin API entry point.
 *
 * The router-wide `authenticate, requireAdmin` guard runs FIRST (nothing below
 * is reachable unauthenticated), then each sub-router in server/routes/admin/
 * serves one resource family. Route bodies moved verbatim out of this file —
 * same paths, same order, same audit logging.
 */
import { Router } from 'express';
import { db, isPostgres } from '../db/index.js';
import { users, products, orders, orderItems, reviews, coupons, productFeatures, cartItems, wishlistItems, storeSettings, auditLogs } from '../db/schema.js';
import { appCache } from '../utils/cache.js';
import { STORE_SETTINGS_DEFAULTS } from '../../src/lib/constants.js';
import { HERO_IMAGE_DEFAULTS } from './settings.js';
import { eq, ne, desc, sql, inArray, and } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bulkIdsSchema, adminPasswordSchema, roleSchema, pointsSchema, productCreateSchema, productUpsertSchema, orderStatusSchema, couponCreateSchema, couponUpsertSchema, trackingSchema, approvedSchema, messageStatusSchema, settingsSchema } from '../validators/index.js';
import { bumpTokenVersion } from './tokenVersion.js';
import { restockItemsAndRefundPoints } from '../lib/orderLifecycle.js';
import { env } from '../env.js';
import auditLogsRouter from './admin/auditLogs.js';
import statsRouter from './admin/stats.js';
import usersRouter from './admin/users.js';
import productsRouter from './admin/products.js';
import ordersRouter from './admin/orders.js';
import couponsRouter from './admin/coupons.js';
import messagesRouter from './admin/messages.js';
import reviewsRouter from './admin/reviews.js';
import newsletterRouter from './admin/newsletter.js';
import settingsRouter from './admin/settings.js';
import backupRouter from './admin/backup.js';

const router = Router();

// Apply middleware to all admin routes
router.use(authenticate, requireAdmin);

router.use(auditLogsRouter);
router.use(statsRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(couponsRouter);
router.use(messagesRouter);
router.use(reviewsRouter);
router.use(newsletterRouter);
router.use(settingsRouter);
router.use(backupRouter);

export default router;
