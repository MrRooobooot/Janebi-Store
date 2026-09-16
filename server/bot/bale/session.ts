/**
 * Session store, number formatters, admin check, audit writer.
 * Split out of server/bot/bale.ts (body moved verbatim).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import {
  products,
  productFeatures,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  reviews,
  coupons,
  contactMessages,
  storeSettings,
  users,
  auditLogs,
  newsletterSubscribers,
} from '../../db/schema.js';
import type { Context } from 'grammy';
import type { BaleBotConfig, UserSession } from './types.js';

export const sessions = new Map<number, UserSession>();

// Cleanup stale sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function getSession(userId: number): UserSession {
  let s = sessions.get(userId);
  if (!s) {
    s = { mode: 'idle', lastActive: Date.now() };
    sessions.set(userId, s);
  }
  s.lastActive = Date.now();
  return s;
}

export function clearSession(userId: number): void {
  sessions.delete(userId);
}

// -------------------------------------------------------------
// Helpers & Persian Utilities
// -------------------------------------------------------------
export const fmt = (n: number) => n.toLocaleString('fa-IR');

export function fa2en(s: string): string {
  return s
    .replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)));
}

export function parsePrice(text: string): number {
  const clean = fa2en(text).replace(/[^\d]/g, '');
  return parseInt(clean, 10);
}

export function isAdmin(ctx: Context, cfg: BaleBotConfig): boolean {
  const id = ctx.from?.id;
  return !!id && cfg.adminChatIds.includes(id);
}

export function logAudit(action: string, adminUserId: string, entityId: string, meta: Record<string, unknown> = {}): void {
  db.insert(auditLogs).values({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    adminUserId,
    action,
    entity: 'store',
    entityId,
    meta,
    createdAt: new Date().toISOString(),
  }).catch((err) => console.error('[bale-bot] Audit log write failed:', err));
}

// -------------------------------------------------------------
// Image Storage from Bale CDN
// -------------------------------------------------------------
