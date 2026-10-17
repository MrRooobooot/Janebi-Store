/**
 * Reply helper and the sub-view renderers used by the Bale bot handlers.
 * Split out of server/bot/bale.ts (bodies moved verbatim).
 */
import { InlineKeyboard, type Context } from 'grammy';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  products,
  orders,
  reviews,
  coupons,
  contactMessages,
  storeSettings,
  users,
  newsletterSubscribers,
} from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
import { restockItemsAndRefundPoints } from '../../lib/orderLifecycle.js';
import type { WizardDraft } from './types.js';
import { fmt, logAudit } from './session.js';
import { getStoreCategories, ORDER_STATUS_MAP } from './catalog.js';
import { makeMainMenuKeyboard, makeSettingsSectionKeyboard, makeConfirmWizardKeyboard, makeProductDetailKeyboard, makeOrderDetailKeyboard } from './keyboards.js';

export async function editOrReply(ctx: Context, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
  const safeText = text.length > 4000 ? text.slice(0, 3990) + '...' : text;
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(safeText, { reply_markup: replyMarkup });
      return;
    } catch (err: any) {
      if (err.message?.includes('message is not modified')) {
        return;
      }
    }
  }
  try {
    await ctx.reply(safeText, { reply_markup: replyMarkup });
  } catch (err: any) {
    if (replyMarkup) {
      await ctx.reply(safeText).catch(() => {});
    }
  }
}

export async function showProductConfirmation(ctx: Context, d: WizardDraft): Promise<void> {
  const summary =
    '📋 *پیش‌نمایش ثبت محصول جدید*\n\n' +
    `▫️ *عنوان:* ${d.title}\n` +
    `▫️ *دسته‌بندی:* ${d.category}\n` +
    `▫️ *قیمت:* ${fmt(d.price!)} تومان\n` +
    `▫️ *موجودی:* ${fmt(d.stock!)} عدد\n` +
    `▫️ *برند:* ${d.brand}\n` +
    `▫️ *گارانتی:* ${d.warranty || '—'}\n` +
    `▫️ *توضیحات:* ${d.description || '—'}\n` +
    `▫️ *تصویر:* ${d.photoUrl}\n\n` +
    'جهت انتشار فوری در وب‌سایت تأیید کنید:';

  await ctx.reply(summary, { reply_markup: makeConfirmWizardKeyboard() });
}

export async function showProductsList(ctx: Context, page: number): Promise<void> {
  const pageSize = 5;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(products).orderBy(desc(products.id)).limit(pageSize).offset(curPage * pageSize);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('➕ ثبت محصول جدید', 'm:new').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '📦 هیچ محصولی در فروشگاه ثبت نشده است.', kb);
    return;
  }

  const kb = new InlineKeyboard();
  for (const p of rows) {
    const icon = p.stockQuantity === 0 ? '🔴' : p.stockQuantity <= 3 ? '🟡' : '📦';
    const shortTitle = p.title.length > 20 ? p.title.slice(0, 18) + '..' : p.title;
    kb.text(`${icon} ${shortTitle} | ${fmt(p.price)} ت (${fmt(p.stockQuantity)})`, `p:v:${p.id}`).row();
  }

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:p:${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:p:${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('➕ ثبت محصول', 'm:new').text('📁 دسته‌ها', 'm:cat_pick:0').row().text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, `📦 *فهرست کالاهای فروشگاه* (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total}):`, kb);
}

export async function showProductsByCategory(ctx: Context, categoryName: string, page: number): Promise<void> {
  const pageSize = 5;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.category, categoryName));
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(products).where(eq(products.category, categoryName)).orderBy(desc(products.id)).limit(pageSize).offset(curPage * pageSize);

  const kb = new InlineKeyboard();
  for (const p of rows) {
    const icon = p.stockQuantity === 0 ? '🔴' : p.stockQuantity <= 3 ? '🟡' : '📦';
    const shortTitle = p.title.length > 20 ? p.title.slice(0, 18) + '..' : p.title;
    kb.text(`${icon} ${shortTitle} | ${fmt(p.price)} ت (${fmt(p.stockQuantity)})`, `p:v:${p.id}`).row();
  }

  const cats = await getStoreCategories();
  const catIdx = cats.indexOf(categoryName);

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `cpk:list:${catIdx}:${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `cpk:list:${catIdx}:${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('📁 انتخاب دسته دیگر', 'm:cat_pick:0').text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, `📁 *کالاهای دسته «${categoryName}»* (${total} محصول):`, kb);
}

export async function showProductDetail(ctx: Context, prodId: number): Promise<void> {
  const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
  if (!p) {
    await ctx.reply('کالای مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
    return;
  }

  let stockBadge = '🟢 موجود در انبار';
  if (p.stockQuantity === 0) {
    stockBadge = '🔴 ناموجود';
  } else if (p.stockQuantity <= 3) {
    stockBadge = '🟡 رو به اتمام (فوری)';
  }

  const hasDiscount = p.discount != null && p.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(p.price * (1 - p.discount! / 100))
    : p.price;

  const rawImage = p.image || '/placeholder-product.svg';
  const webImageUrl = rawImage.startsWith('http')
    ? rawImage
    : `https://janebiarena.ir${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  let descSnippet = '—';
  if (p.description) {
    const cleanDesc = p.description.replace(/\s+/g, ' ').trim();
    descSnippet = cleanDesc.length > 80 ? cleanDesc.slice(0, 80) + '...' : cleanDesc;
  }

  const text =
    `📱 *کارت مشخصات و مدیریت کالا* | کد ${p.id}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *${p.title}*\n\n` +
    `📊 *وضعیت انبار:* ${stockBadge} (${fmt(p.stockQuantity)} عدد)\n` +
    `💰 *قیمت پایه:* *${fmt(p.price)} تومان*\n` +
    (hasDiscount
      ? `🔥 *تخفیف ویژه:* ${fmt(p.discount!)}% ➔ *${fmt(finalPrice)} تومان*\n`
      : `🏷 *تخفیف:* ندارد\n`) +
    `⭐ *امتیاز و نظرات:* ${p.rating ? `${fmt(p.rating)} از ۵` : '—'} (${fmt(p.reviewsCount || 0)} نظر ثبت‌شده)\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📁 *دسته‌بندی:* ${p.category}\n` +
    `🏭 *برند سازنده:* ${p.brand || 'متفرقه'}\n` +
    `🛡 *گارانتی:* ${p.warranty || 'اصالت و سلامت فیزیکی'}\n` +
    `🔖 *کد کالا (SKU):* \`${p.sku || '—'}\`\n` +
    `📝 *خلاصه توضیحات:* ${descSnippet}\n` +
    `🖼 *تصویر کالا:* [مشاهده در سایت یا مرورگر](${webImageUrl})\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `جهت ویرایش موجودی، قیمت، تخفیف یا عکس از دکمه‌های زیر استفاده فرمایید:`;

  await editOrReply(ctx, text, makeProductDetailKeyboard(p.id, p.stockQuantity));
}

export async function showOrdersList(ctx: Context, page: number, statusFilter?: string): Promise<void> {
  const pageSize = 5;
  const condition = statusFilter ? eq(orders.status, statusFilter) : undefined;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(condition);
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(orders).where(condition).orderBy(desc(orders.date)).limit(pageSize).offset(curPage * pageSize);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('🛍 بازگشت به سفارش‌ها', 'm:sec_ord').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '🛍 هیچ سفارشی در این وضعیت یافت نشد.', kb);
    return;
  }

  const kb = new InlineKeyboard();
  for (const o of rows) {
    const st = ORDER_STATUS_MAP[o.status] || { icon: '▫️', label: o.statusText };
    const shortId = o.id.length > 12 ? o.id.slice(0, 10) + '..' : o.id;
    kb.text(`${st.icon} ${shortId} | ${o.recipientName} | ${fmt(o.total)} ت`, `o:v:${o.id}`).row();
  }

  const navRow: { text: string; data: string }[] = [];
  const navBase = statusFilter ? `m:of:${statusFilter}:` : 'm:o:';
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `${navBase}${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `${navBase}${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('🛍 منوی سفارشات', 'm:sec_ord').text('🏠 منوی اصلی', 'm:menu');

  const filterText = statusFilter ? ` (فیلتر: ${ORDER_STATUS_MAP[statusFilter]?.label || statusFilter})` : '';
  await editOrReply(ctx, `🛍 *سفارش‌های فروشگاه*${filterText} (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total}):`, kb);
}

export async function showOrderDetail(ctx: Context, orderId: string): Promise<void> {
  const o = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });

  if (!o) {
    await ctx.reply('سفارش مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
    return;
  }

  const st = ORDER_STATUS_MAP[o.status] || { icon: '▫️', label: o.statusText };
  const itemsList =
    (o as any).items?.map((it: any, idx: number) => `  ${fmt(idx + 1)}. ${it.title} (تعداد: ${fmt(it.qty)}) — ${fmt(it.price)} تومان`).join('\n') || '  (بدون اقلام)';

  const text =
    `🛍 *جزئیات سفارش:* \`${o.id}\`\n\n` +
    `👤 *مشتری:* ${o.recipientName}\n` +
    `📞 *شماره تماس:* \`${o.recipientPhone}\`\n` +
    `📍 *آدرس:* ${o.recipientAddress}\n` +
    `💳 *روش پرداخت:* ${o.paymentMethod === 'online' ? 'درگاه آنلاین' : o.paymentMethod}\n` +
    `📊 *وضعیت فعلی:* ${st.icon} *${st.label}*\n` +
    `💰 *مبلغ نهایی:* *${fmt(o.total)} تومان*\n` +
    `🗓 *تاریخ ثبت:* ${o.date}\n\n` +
    `📦 *اقلام سفارش:*\n${itemsList}\n\n` +
    `جهت تغییر وضعیت روی یکی از گزینه‌ها بزنید:`;

  await editOrReply(ctx, text, makeOrderDetailKeyboard(o.id));
}

export async function updateOrderStatus(ctx: Context, orderId: string, nextStatus: string, onToast?: (t: string) => Promise<void>): Promise<void> {
  const stConfig = ORDER_STATUS_MAP[nextStatus];
  if (!stConfig) return;

  if (nextStatus === 'cancelled') {
    await db.transaction(async (tx) => {
      const orderList = await tx.select().from(orders).where(eq(orders.id, orderId));
      const order = orderList[0];
      if (!order || order.status === 'cancelled') return;

      await restockItemsAndRefundPoints(tx, orderId, order.userId, order.vipPointsUsed);
      await tx.update(orders).set({ status: 'cancelled', statusText: stConfig.text }).where(eq(orders.id, orderId));
    });
    appCache.invalidate('products');
  } else {
    await db.update(orders).set({ status: nextStatus, statusText: stConfig.text }).where(eq(orders.id, orderId));
  }

  logAudit('order.status.update', `bale-${ctx.from?.id}`, orderId, { status: nextStatus });
  if (onToast) {
    await onToast(`✅ وضعیت سفارش به «${stConfig.label}» تغییر یافت`);
  } else {
    await ctx.answerCallbackQuery({ text: `✅ وضعیت سفارش به «${stConfig.label}» تغییر یافت` }).catch(() => {});
  }
  await showOrderDetail(ctx, orderId);
}

export async function showCouponsList(ctx: Context, page: number): Promise<void> {
  const pageSize = 5;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(coupons);
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(coupons).limit(pageSize).offset(curPage * pageSize);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('➕ ساخت اولین کوپن', 'm:cp_new').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '🏷 هیچ کد تخفیفی ثبت نشده است.', kb);
    return;
  }

  const kb = new InlineKeyboard();
  let text = `🏷 *فهرست کدهای تخفیف* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;
  for (const c of rows) {
    const statusIcon = c.active ? '🟢' : '🔴';
    text += `▫️ *${c.code}* (${c.percent ? `${fmt(c.percent)}%` : `${fmt(c.amount || 0)} ت`}) — ${statusIcon}\n`;
    text += `   حداقل سفارش: ${fmt(c.minTotal)} ت | مصرف: ${fmt(c.usedCount)}\n`;
    kb.text(`${statusIcon} فعال/غیرفعال ${c.code}`, `cp:tog:${c.code}`)
      .text(`🗑 حذف`, `cp:del:${c.code}`)
      .row();
  }

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:cp_list:${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:cp_list:${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('➕ کد جدید', 'm:cp_new').text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, text, kb);
}

export async function showReviewsList(ctx: Context, page: number): Promise<void> {
  const pageSize = 4;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(reviews);
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(reviews).orderBy(desc(reviews.date)).limit(pageSize).offset(curPage * pageSize);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '⭐ هیچ نظری ثبت نشده است.', kb);
    return;
  }

  const kb = new InlineKeyboard();
  let text = `⭐ *نظرات ثبت‌شده کاربران* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;

  for (const r of rows) {
    const st = r.approved ? '✅ تأیید شده' : '⏳ در انتظار / رد';
    text += `▫️ *${r.userName}* (${'⭐'.repeat(r.rating)}) [${st}]\n`;
    text += `«${r.comment.slice(0, 70)}${r.comment.length > 70 ? '...' : ''}»\n`;

    if (!r.approved) {
      kb.text(`✅ تأیید نظر`, `rv:app:${r.id}`);
    } else {
      kb.text(`❌ رد نظر`, `rv:rej:${r.id}`);
    }
    kb.text(`🗑 حذف`, `rv:del:${r.id}`).row();
  }

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:rv_list:${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:rv_list:${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('💬 نظرات و پیام‌ها', 'm:sec_msg').text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, text, kb);
}

export async function showContactMessagesList(ctx: Context, page: number): Promise<void> {
  const pageSize = 4;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(contactMessages);
  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(pageSize).offset(curPage * pageSize);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '📩 پیامی در فرم تماس با ما ثبت نشده است.', kb);
    return;
  }

  const kb = new InlineKeyboard();
  let text = `📩 *پیام‌های دریافتی فرم تماس* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;

  for (const m of rows) {
    const isUnread = m.status === 'unread';
    text += `${isUnread ? '🔴' : '⚪'} *${m.name}* (${m.phone || m.email})\n`;
    text += `موضوع: *${m.subject || 'بدون موضوع'}*\n`;
    text += `«${m.message.slice(0, 80)}...»\n`;

    if (isUnread) {
      kb.text(`✔️ خوانده شد`, `cm:read:${m.id}`);
    }
    kb.text(`🗄️ آرشیو`, `cm:arc:${m.id}`).row();
  }

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:cm_list:${curPage - 1}` });
  if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:cm_list:${curPage + 1}` });

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }
  kb.text('💬 نظرات و پیام‌ها', 'm:sec_msg').text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, text, kb);
}

export async function showUserDetail(ctx: Context, uId: string): Promise<void> {
  const u = await db.query.users.findFirst({ where: eq(users.id, uId) });
  if (!u) {
    await ctx.reply('مشتری یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
    return;
  }

  const [orderCountRow] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.userId, u.id));
  const totalUserOrders = Number(orderCountRow?.count ?? 0);

  const text =
    `👤 *مشخصات مشتری*\n\n` +
    `▫️ *نام:* ${u.name}\n` +
    `▫️ *شماره موبایل:* \`${u.phone}\`\n` +
    `▫️ *نقش کاربری:* ${u.role === 'admin' ? '🛡 مدیر' : 'کاربر عادی'}\n` +
    `▫️ *امتیاز باشگاه مشتریان (VIP):* 🔥 *${fmt(u.vipPoints || 0)} امتیاز*\n` +
    `▫️ *تعداد سفارشات:* ${fmt(totalUserOrders)} سفارش\n\n` +
    `جهت تشویق و وفادارسازی مشتری، می‌توانید امتیاز هدیه اعطا کنید:`;

  const kb = new InlineKeyboard()
    .text('🎁 +۵۰ امتیاز', `u:vip:${u.id}:50`)
    .text('🎁 +۱۰۰ امتیاز', `u:vip:${u.id}:100`)
    .row()
    .text('🔍 جستجوی مشتری دیگر', 'm:usr_srch')
    .text('🏠 منوی اصلی', 'm:menu');

  await editOrReply(ctx, text, kb);
}

export async function showSettingsMenu(ctx: Context): Promise<void> {
  const isBarOn = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarEnabled') }))?.value === 'true';
  const barTxt = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarText') }))?.value || '—';
  const freeTh = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'freeShippingThreshold') }))?.value || '500000';

  const text =
    `⚙️ *تنظیمات فروشگاه و وب‌سایت*\n\n` +
    `📢 *وضعیت نوار اعلان:* ${isBarOn ? '🟢 فعال' : '🔴 غیرفعال'}\n` +
    `📝 *متن اعلان:* «${barTxt}»\n` +
    `🚚 *حداقل مبلغ ارسال رایگان:* *${fmt(parseInt(freeTh, 10) || 0)} تومان*\n\n` +
    `برای تغییر هر یک از تنظیمات دکمه‌های زیر را لمس نمایید:`;

  await editOrReply(ctx, text, makeSettingsSectionKeyboard(isBarOn));
}

export async function showLowStockAlerts(ctx: Context): Promise<void> {
  const rows = await db.select().from(products).where(sql`${products.stockQuantity} <= 5`).orderBy(products.stockQuantity).limit(8);

  if (rows.length === 0) {
    const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, '✅ موجودی تمام کالاها کافی است (هیچ کالایی با ۵ عدد یا کمتر وجود ندارد).', kb);
    return;
  }

  const kb = new InlineKeyboard();
  let text = '⚠️ *هشدارهای انبار (کالاهای ۵ عدد یا کمتر):*\n\n';

  for (const p of rows) {
    const isZero = p.stockQuantity === 0;
    text += `▫️ ${p.title} — موجودی: *${isZero ? '🔴 ناموجود' : `${fmt(p.stockQuantity)} عدد`}*\n`;
    const shortTitle = p.title.length > 16 ? p.title.slice(0, 14) + '..' : p.title;
    kb.text(`🔍 مدیریت «${shortTitle}»`, `p:v:${p.id}`).text('➕۵ موجودی', `p:s:${p.id}:5`).row();
  }

  kb.text('🔄 به‌روزرسانی', 'm:alert').text('🏠 منوی اصلی', 'm:menu');
  await editOrReply(ctx, text, kb);
}

export async function showStoreStats(ctx: Context): Promise<void> {
  const [pCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [oCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

  const revRow = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(sql`status IN ('processing', 'shipped', 'delivered')`);
  const totalRevenue = revRow[0]?.total || 0;

  const [stockSum] = await db.select({ sum: sql<number>`sum(stockQuantity)` }).from(products);
  const [zeroStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} = 0`);
  const [lowStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} <= 5`);
  const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`status IN ('pending_payment', 'processing')`);
  const [unreadMsgs] = await db.select({ count: sql<number>`count(*)` }).from(contactMessages).where(eq(contactMessages.status, 'unread'));
  const [subscribers] = await db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers);

  const text =
    '📊 *داشبورد عملکرد و وضعیت زنده فروشگاه*\n\n' +
    `📦 *تنوع محصولات:* ${fmt(Number(pCount?.count ?? 0))} کالا\n` +
    `🔢 *مجموع موجودی انبار:* ${fmt(Number(stockSum?.sum ?? 0))} قلم کالا\n` +
    `🔴 *کالاهای ناموجود:* ${fmt(Number(zeroStock?.count ?? 0))} مورد\n` +
    `⚠️ *کالاهای کم‌موجودی:* ${fmt(Number(lowStock?.count ?? 0))} مورد\n\n` +
    `🛒 *مجموع کل سفارش‌ها:* ${fmt(Number(oCount?.count ?? 0))} سفارش\n` +
    `⏳ *سفارش‌های در جریان:* ${fmt(Number(pendingOrders?.count ?? 0))} سفارش\n` +
    `💳 *کل فروش موفق:* *${fmt(totalRevenue)} تومان*\n` +
    `📩 *پیام‌های خوانده‌نشده:* ${fmt(Number(unreadMsgs?.count ?? 0))} پیام\n` +
    `📬 *اعضای خبرنامه:* ${fmt(Number(subscribers?.count ?? 0))} نفر`;

  const kb = new InlineKeyboard().text('🔄 به‌روزرسانی آمار', 'm:stat').text('🏠 منوی اصلی', 'm:menu');
  await editOrReply(ctx, text, kb);
}

export async function showHelp(ctx: Context): Promise<void> {
  const text =
    '❓ *راهنمای داشبورد مدیریت فروشگاه Janebi Arena*\n\n' +
    'این ربات یک پنل کامل مدیریت فروشگاهی بر بستر دکمه‌های شیشه‌ای است:\n\n' +
    '📦 *کالاها:* ثبت جدید، مرور بر اساس دسته‌بندی، تغییر فوری موجودی با +/-، تغییر قیمت و درصد تخفیف.\n' +
    '📸 *آپلود عکس:* ارسال مستقیم تصویر یا فایل برای ثبت کالا یا تغییر عکس کالاهای موجود.\n' +
    '🛍 *سفارش‌ها:* مشاهده فیلترشده سفارشات، جزئیات آدرس و تغییر وضعیت به پردازش/ارسال/تحویل یا لغو با بازگشت موجودی.\n' +
    '🏷 *کوپن‌ها:* ساخت سریع کد تخفیف درصدی، فعال و غیرفعال‌سازی با یک کلیک.\n' +
    '💬 *نظرات و پیام‌ها:* تأیید و رد نظرات کاربران (با به‌روزرسانی زنده ستاره‌های کالا) و مشاهده فرم‌های تماس.\n' +
    '👥 *مشتریان:* استعلام مشتری با شماره موبایل و اعطای امتیازات باشگاه وفاداری (VIP).\n' +
    '⚙️ *تنظیمات:* مدیریت پیام نوار بالای سایت و سقف ارسال رایگان.';

  const kb = new InlineKeyboard().text('🏠 بازگشت به منوی اصلی', 'm:menu');
  await editOrReply(ctx, text, kb);
}
