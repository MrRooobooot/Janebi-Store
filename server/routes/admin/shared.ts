/**
 * Shared admin plumbing: owner-account protection, list pagination and the
 * audit-log writer — one copy for every admin sub-router.
 */
import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';
import { sql } from 'drizzle-orm';
import { env } from '../../env.js';

export const ORDER_STATUS_TEXTS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده'
};

// ---------------------------------------------------------
// OWNER (founder account) PROTECTION
// The owner id comes from OWNER_USER_ID (server-side only — never a phone/id
// literal in client code). Other admins may not mutate or even list that row.
// ---------------------------------------------------------
export function ownerUserId(): string {
  return String(process.env.OWNER_USER_ID || env.OWNER_USER_ID || '').trim();
}
export function isOwnerTarget(id: string): boolean {
  const owner = ownerUserId();
  return owner.length > 0 && id === owner;
}
const OWNER_PROTECTED_MESSAGE = 'این حساب (مالک فروشگاه) محافظت‌شده است و توسط ادمین‌های دیگر قابل تغییر نیست';
export function denyOwner(res: any) {
  return res.status(403).json({
    error: OWNER_PROTECTED_MESSAGE,
    message: OWNER_PROTECTED_MESSAGE,
    code: 'OWNER_PROTECTED',
  });
}

// ---------------------------------------------------------
// ADMIN LIST PAGINATION
// Opt-in ?page=&limit= (defaults: page 1, cap 500 rows) — a list endpoint must
// never stream a whole table at the panel. X-Total-Count rides along so a UI
// can build pager controls without a second endpoint.
// ---------------------------------------------------------
export const ADMIN_LIST_CAP = 500;
// No ?limit= → limit null (full list, backwards compatible: a silently truncated
// admin list is its own bug class). Explicit paging is capped so the API cannot be
// asked for an unbounded slice.
export function pageParams(req: any): { limit: number | null; offset: number } {
  const rawLimit = Number(req.query?.limit);
  const rawPage = Number(req.query?.page);
  const explicit = Number.isFinite(rawLimit) && rawLimit > 0;
  if (!explicit) return { limit: null, offset: 0 };
  const limit = Math.min(Math.floor(rawLimit), ADMIN_LIST_CAP);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  return { limit, offset: (page - 1) * limit };
}
export async function setTotalCountHeader(res: any, table: any, where?: any): Promise<void> {
  try {
    const base = db.select({ n: sql<number>`count(*)` }).from(table);
    const rows = where ? await base.where(where) : await base;
    res.setHeader('X-Total-Count', String(Number(rows[0]?.n) || 0));
  } catch (error) {
    console.warn('X-Total-Count failed:', error);
  }
}

// ---------------------------------------------------------
// AUDIT LOG — records every admin mutation (audit §3.7)
// ---------------------------------------------------------
export function logAudit(req: any, action: string, entity: string, entityId: string | null, meta: Record<string, unknown> = {}): void {
  db.insert(auditLogs).values({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    adminUserId: req.user?.id ?? null,
    action,
    entity,
    entityId,
    meta,
    createdAt: new Date().toISOString()
  }).catch((err) => console.error('Audit log write failed:', err));
}
