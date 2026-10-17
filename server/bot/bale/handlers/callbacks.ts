/**
 * Inline-button (callback query) router.
 * Split out of server/bot/bale.ts (bodies moved verbatim).
 */
import { Bot, InlineKeyboard } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  products,
  productFeatures,
  cartItems,
  wishlistItems,
  reviews,
  coupons,
  contactMessages,
  storeSettings,
  users,
} from '../../../db/schema.js';
import { STORE_SETTINGS_DEFAULTS } from '../../../../src/lib/constants.js';
import { appCache } from '../../../utils/cache.js';
import type { BaleBotConfig } from '../types.js';
import { getSession, clearSession, fmt, isAdmin, logAudit } from '../session.js';
import { getStoreCategories, setReviewApproval } from '../catalog.js';
import { makeMainMenuKeyboard, makeProductsSectionKeyboard, makeOrdersSectionKeyboard, makeCouponsSectionKeyboard, makeMessagesSectionKeyboard, makeUsersSectionKeyboard, makeVipBannerKeyboard, makeCancelKeyboard, makeCategoriesKeyboard, makeBrandQuickKeyboard, makeWarrantyQuickKeyboard, makeDescriptionQuickKeyboard, makePhotoQuickKeyboard, makeProductDeleteConfirmKeyboard } from '../keyboards.js';
import { editOrReply, showProductConfirmation, showProductsList, showProductsByCategory, showProductDetail, showOrdersList, showOrderDetail, updateOrderStatus, showCouponsList, showReviewsList, showContactMessagesList, showUserDetail, showSettingsMenu, showLowStockAlerts, showStoreStats, showHelp } from '../views.js';

export function registerCallbackHandlers(bot: Bot, cfg: BaleBotConfig): void {
  // --- Callback Query Router ---
  bot.on('callback_query:data', async (ctx) => {
    if (!isAdmin(ctx, cfg)) {
      await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }).catch(() => {});
      return;
    }

    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const session = getSession(userId);

    let cbAnswered = false;
    const answerCb = async (toastText?: string, showAlert = false) => {
      if (cbAnswered) return;
      cbAnswered = true;
      try {
        await ctx.answerCallbackQuery(toastText ? { text: toastText, show_alert: showAlert } : undefined);
      } catch {}
    };

    try {
      if (data.startsWith('p:web:')) {
        const prodId = parseInt(data.replace('p:web:', ''), 10);
        await answerCb('🔗 لینک کالا ارسال شد');
        await ctx.reply(`🔗 *لینک مستقیم مشاهده محصول در سایت:*\nhttps://janebiarena.ir/products/${prodId}`);
        return;
      }

      // 1. Navigation Sections
      if (data === 'm:menu') {
      clearSession(userId);
      await editOrReply(
        ctx,
        '🛍 *سامانه مدیریت هوشمند Janebi Arena*\n\n' +
        'از دکمه‌های شیشه‌ای زیر جهت دسترسی به بخش‌های فروشگاه استفاده کنید:',
        makeMainMenuKeyboard()
      );
      return;
    }

    if (data === 'm:sec_prod') {
      await editOrReply(ctx, '📦 *مدیریت کالاها و انبار:*\nیکی از گزینه‌های زیر را انتخاب کنید:', makeProductsSectionKeyboard());
      return;
    }

    if (data === 'm:upl_img') {
      session.mode = 'await_upload';
      await editOrReply(
        ctx,
        '📸 *آپلود مستقیم عکس به فروشگاه*\n\n' +
        'تصویر مورد نظر را در همین چت ارسال نمایید (به صورت عکس یا فایل سند تصویری JPG/PNG/WebP).\n\n' +
        'تصویر بلافاصله در سرور ذخیره شده و می‌توانید آن را به یک کالای موجود اختصاص دهید یا با آن کالای جدید ثبت نمایید.',
        makeCancelKeyboard()
      );
      return;
    }

    if (data === 'm:sec_ord') {
      await editOrReply(ctx, '🛍 *مدیریت سفارشات فروشگاه:*\nفیلتر مورد نظر را انتخاب کنید:', makeOrdersSectionKeyboard());
      return;
    }

    if (data === 'm:sec_coup') {
      await editOrReply(ctx, '🏷 *کدهای تخفیف و کوپن‌ها:*\nجهت مشاهده یا ساخت کد تخفیف انتخاب کنید:', makeCouponsSectionKeyboard());
      return;
    }

    if (data === 'm:sec_msg') {
      await editOrReply(ctx, '💬 *نظرات کاربران و فرم‌های تماس:*\nبخش مورد نظر را انتخاب نمایید:', makeMessagesSectionKeyboard());
      return;
    }

    if (data === 'm:sec_user') {
      await editOrReply(ctx, '👥 *مدیریت مشتریان و امتیازات VIP:*\nجهت استعلام مشتری دکمه زیر را لمس کنید:', makeUsersSectionKeyboard());
      return;
    }

    if (data === 'm:sec_set') {
      await showSettingsMenu(ctx);
      return;
    }

    if (data === 'm:cancel') {
      clearSession(userId);
      await editOrReply(ctx, 'عملیات لغو شد و به منوی اصلی بازگشتید.', makeMainMenuKeyboard());
      return;
    }

    if (data === 'm:help') {
      await showHelp(ctx);
      return;
    }

    if (data === 'm:alert') {
      await showLowStockAlerts(ctx);
      return;
    }

    if (data === 'm:stat') {
      await showStoreStats(ctx);
      return;
    }

    // 2. Product Management
    if (data === 'm:new') {
      session.mode = 'wizard';
      session.wizard = { step: 'title', catPage: 0 };
      await editOrReply(ctx, '🏷 لطفاً *نام محصول جدید* را بفرستید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('m:p:')) {
      const page = parseInt(data.replace('m:p:', ''), 10) || 0;
      await showProductsList(ctx, page);
      return;
    }

    if (data.startsWith('m:cat_pick:')) {
      const page = parseInt(data.replace('m:cat_pick:', ''), 10) || 0;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی مورد نظر را برای مشاهده کالاها انتخاب کنید:*', makeCategoriesKeyboard(cats, page, 'cpk:cat:'));
      return;
    }

    if (data.startsWith('cpk:pg:')) {
      const page = parseInt(data.replace('cpk:pg:', ''), 10) || 0;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی مورد نظر را انتخاب کنید:*', makeCategoriesKeyboard(cats, page, 'cpk:cat:'));
      return;
    }

    if (data.startsWith('cpk:cat:')) {
      const idx = parseInt(data.replace('cpk:cat:', ''), 10);
      const cats = await getStoreCategories();
      const chosen = cats[idx];
      if (!chosen) return;
      await showProductsByCategory(ctx, chosen, 0);
      return;
    }

    if (data.startsWith('cpk:list:')) {
      const [, , catIdxStr, pageStr] = data.split(':');
      const cats = await getStoreCategories();
      const chosen = cats[parseInt(catIdxStr, 10)];
      if (!chosen) return;
      await showProductsByCategory(ctx, chosen, parseInt(pageStr, 10) || 0);
      return;
    }

    if (data === 'm:srch') {
      session.mode = 'search';
      await editOrReply(ctx, '🔍 لطفاً *نام یا کد کالای (SKU)* مورد نظر را ارسال کنید:', makeCancelKeyboard());
      return;
    }

    // Wizard Flow
    if (data.startsWith('c:cat:')) {
      if (!session.wizard || session.wizard.step !== 'category') return;
      const idx = parseInt(data.replace('c:cat:', ''), 10);
      const cats = await getStoreCategories();
      const chosenCat = cats[idx] || cats[0];
      session.wizard.category = chosenCat;
      session.wizard.step = 'price';
      await editOrReply(
        ctx,
        `📁 دسته انتخاب شد: *${chosenCat}*\n\n💰 حالا *قیمت محصول (تومان)* را ارسال کنید (مثلاً ۲۵۰۰۰۰ یا 250,000):`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('c:pg:')) {
      if (!session.wizard || session.wizard.step !== 'category') return;
      const page = parseInt(data.replace('c:pg:', ''), 10) || 0;
      session.wizard.catPage = page;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی محصول* را انتخاب کنید:', makeCategoriesKeyboard(cats, page));
      return;
    }

    if (data.startsWith('w:stk:')) {
      if (!session.wizard || session.wizard.step !== 'stock') return;
      session.wizard.stock = parseInt(data.replace('w:stk:', ''), 10);
      session.wizard.step = 'brand';
      await editOrReply(
        ctx,
        `📦 موجودی: *${session.wizard.stock} عدد*\n\n🏭 *برند محصول* را انتخاب کنید یا نام آن را بفرستید:`,
        makeBrandQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:brd:')) {
      if (!session.wizard || session.wizard.step !== 'brand') return;
      session.wizard.brand = data.replace('w:brd:', '');
      session.wizard.step = 'warranty';
      await editOrReply(
        ctx,
        `🏭 برند: *${session.wizard.brand}*\n\n🛡 *نوع گارانتی* را انتخاب کنید یا بنویسید:`,
        makeWarrantyQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:war:')) {
      if (!session.wizard || session.wizard.step !== 'warranty') return;
      session.wizard.warranty = data.replace('w:war:', '');
      session.wizard.step = 'description';
      await editOrReply(
        ctx,
        `🛡 گارانتی: *${session.wizard.warranty}*\n\n📝 *توضیحات یا نکات کلیدی کالا* را ارسال کنید (یا دکمه رد شدن):`,
        makeDescriptionQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:skip:')) {
      if (!session.wizard) return;
      const step = data.replace('w:skip:', '');
      if (step === 'brand') {
        session.wizard.brand = 'متفرقه';
        session.wizard.step = 'warranty';
        await editOrReply(ctx, '🏭 برند: *متفرقه*\n\n🛡 *نوع گارانتی* را انتخاب کنید یا بنویسید:', makeWarrantyQuickKeyboard());
        return;
      }
      if (step === 'warranty') {
        session.wizard.warranty = 'اصالت و سلامت فیزیکی';
        session.wizard.step = 'description';
        await editOrReply(ctx, '🛡 گارانتی: *اصالت و سلامت فیزیکی*\n\n📝 *توضیحات کالا* را بفرستید (یا رد شدن):', makeDescriptionQuickKeyboard());
        return;
      }
      if (step === 'desc') {
        session.wizard.description = undefined;
        if (session.wizard.photoUrl) {
          // Guard against stale/incomplete wizard drafts
          if (!Number.isFinite(session.wizard.price) || !Number.isFinite(session.wizard.stock) || !session.wizard.title || !session.wizard.category) {
            clearSession(userId);
            await editOrReply(ctx, '⚠️ پیش‌نویس قبلی ناقص بود. لطفاً ثبت کالا را از ابتدا شروع کنید:', makeMainMenuKeyboard());
            return;
          }
          session.wizard.step = 'confirm';
          await showProductConfirmation(ctx, session.wizard);
          return;
        }
        session.wizard.step = 'photo';
        await editOrReply(ctx, '📝 توضیحات رد شد.\n\n🖼 حالا *عکس کالا* را مستقیماً در همین چت بفرستید (یا لینک عکس را بفرستید):', makePhotoQuickKeyboard());
        return;
      }
      if (step === 'photo') {
        // Guard against stale/incomplete wizard drafts (e.g. old buttons from abandoned /new)
        if (!Number.isFinite(session.wizard.price) || !Number.isFinite(session.wizard.stock) || !session.wizard.title || !session.wizard.category) {
          clearSession(userId);
          await editOrReply(ctx, '⚠️ پیش‌نویس قبلی ناقص بود. لطفاً ثبت کالا را از ابتدا شروع کنید:', makeMainMenuKeyboard());
          return;
        }
        session.wizard.photoUrl = '/placeholder-product.svg';
        session.wizard.step = 'confirm';
        await showProductConfirmation(ctx, session.wizard);
        return;
      }
    }

    if (data === 'w:ok') {
      if (!session.wizard || session.wizard.step !== 'confirm') {
        await ctx.reply('پیش‌نویسی برای ثبت یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
        return;
      }
      const d = session.wizard;
      try {
        const sku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const [inserted] = await db.insert(products).values({
          title: d.title!,
          category: d.category!,
          price: d.price!,
          originalPrice: d.price!,
          discount: 0,
          image: d.photoUrl || '/placeholder-product.svg',
          brand: d.brand || 'متفرقه',
          warranty: d.warranty,
          description: d.description,
          stockQuantity: d.stock || 10,
          sku,
        }).returning();

        appCache.invalidate('products');
        appCache.invalidate('categories');
        logAudit('product.create', `bale-${userId}`, String(inserted.id), {
          title: inserted.title,
          price: inserted.price,
          stock: inserted.stockQuantity,
        });

        clearSession(userId);

        const doneKb = new InlineKeyboard()
          .text('🔗 لینک محصول در سایت', `p:web:${inserted.id}`)
          .row()
          .text('➕ ثبت کالای دیگر', 'm:new')
          .text('🏠 منوی اصلی', 'm:menu');

        await editOrReply(
          ctx,
          `🎉 *کالا با موفقیت ثبت و در فروشگاه منتشر شد!*\n\n` +
          `▫️ *شناسه:* ${inserted.id}\n` +
          `▫️ *نام:* ${inserted.title}\n` +
          `▫️ *قیمت:* ${fmt(inserted.price)} تومان\n` +
          `▫️ *موجودی:* ${fmt(inserted.stockQuantity)} عدد\n` +
          `▫️ *کد کالا:* \`${inserted.sku}\``,
          doneKb
        );
      } catch (err: any) {
        await ctx.reply(`❌ خطا در ذخیره‌سازی کالا: ${err.message}`, { reply_markup: makeMainMenuKeyboard() });
      }
      return;
    }

    // Product actions
    if (data.startsWith('p:v:')) {
      const prodId = parseInt(data.replace('p:v:', ''), 10);
      await showProductDetail(ctx, prodId);
      return;
    }

    if (data.startsWith('p:s:')) {
      const [, , idStr, deltaStr] = data.split(':');
      const prodId = parseInt(idStr, 10);
      const delta = parseInt(deltaStr, 10);

      const existing = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      if (!existing) {
        await ctx.reply('کالای مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
        return;
      }

      const newStock = Math.max(0, existing.stockQuantity + delta);
      await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.stock.update', `bale-${userId}`, String(prodId), { from: existing.stockQuantity, to: newStock, delta });

      await answerCb(`✅ موجودی جدید: ${newStock} عدد`);
      await showProductDetail(ctx, prodId);
      return;
    }

    if (data.startsWith('p:stk:')) {
      const prodId = parseInt(data.replace('p:stk:', ''), 10);
      session.mode = 'edit_stock';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `📦 *تنظیم موجودی دقیق کالا*\n\n` +
        `کالا: *${p?.title || prodId}*\n` +
        `موجودی فعلی: *${fmt(p?.stockQuantity || 0)} عدد*\n\n` +
        `لطفاً *تعداد موجودی جدید* را به عنوان عدد بفرستید (مثلاً: ۲۵ یا ۰):`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:prc:')) {
      const prodId = parseInt(data.replace('p:prc:', ''), 10);
      session.mode = 'edit_price';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `💰 *ویرایش قیمت کالا*\n\nکالا: *${p?.title || prodId}*\nقیمت فعلی: *${fmt(p?.price || 0)} تومان*\n\nلطفاً *قیمت جدید (تومان)* را بفرستید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:dsc:')) {
      const prodId = parseInt(data.replace('p:dsc:', ''), 10);
      session.mode = 'edit_discount';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `🏷 *تنظیم تخفیف کالا*\n\nکالا: *${p?.title || prodId}*\nتخفیف فعلی: *${fmt(p?.discount || 0)}%*\n\nلطفاً *درصد تخفیف جدید (عدد ۰ تا ۹۰)* را ارسال کنید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:pho:')) {
      const prodId = parseInt(data.replace('p:pho:', ''), 10);
      session.mode = 'edit_photo';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `📸 *تغییر تصویر کالا*\n\n` +
        `کالا: *${p?.title || prodId}*\n` +
        `تصویر فعلی: \`${p?.image || '—'}\`\n\n` +
        `لطفاً عکس جدید را به صورت Photo یا فایل سند (JPG/PNG/WebP) ارسال فرمایید یا لینک اینترنتی آن را بفرستید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data === 'w:new:img') {
      const photoUrl = session.uploadedPhotoUrl;
      session.mode = 'wizard';
      session.wizard = { step: 'title', photoUrl, catPage: 0 };
      await editOrReply(
        ctx,
        `✨ *ثبت کالای جدید با تصویر آپلود شده*\n\n` +
        `▫️ تصویر: \`${photoUrl}\`\n\n` +
        `مرحله ۱ از ۷: لطفاً *عنوان محصول* را ارسال فرمایید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data === 'p:asg:img') {
      session.mode = 'assign_photo';
      await editOrReply(
        ctx,
        `🔄 *اتصال تصویر به کالای موجود*\n\n` +
        `تصویر: \`${session.uploadedPhotoUrl}\`\n\n` +
        `لطفاً *شناسه (ID) عددی کالا* یا *بخشی از نام کالا* را ارسال فرمایید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:set_img:')) {
      const prodId = parseInt(data.replace('p:set_img:', ''), 10);
      const photoUrl = session.uploadedPhotoUrl;
      if (!photoUrl) {
        await ctx.reply('❌ اطلاعات تصویر یافت نشد. لطفاً عکس را مجدداً ارسال فرمایید.');
        clearSession(userId);
        return;
      }
      const [updated] = await db.update(products).set({ image: photoUrl }).where(eq(products.id, prodId)).returning();
      appCache.invalidate('products');
      appCache.invalidate('categories');
      appCache.invalidate(`product:${prodId}`);
      logAudit('product.assign_photo', `bale-${userId}`, String(prodId), { newImage: photoUrl });
      clearSession(userId);
      await ctx.reply(`✅ تصویر کالای *${updated?.title || prodId}* با موفقیت ثبت شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    if (data.startsWith('p:del:')) {
      const prodId = parseInt(data.replace('p:del:', ''), 10);
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `⚠️ *آیا از حذف محصول زیر اطمینان دارید؟*\n\n▫️ *نام:* ${p?.title}\n▫️ *شناسه:* ${prodId}\n\nعملیات غیرقابل بازگشت است.`,
        makeProductDeleteConfirmKeyboard(prodId)
      );
      return;
    }

    if (data.startsWith('p:dely:')) {
      const prodId = parseInt(data.replace('p:dely:', ''), 10);
      try {
        await db.transaction(async (tx) => {
          await tx.delete(cartItems).where(eq(cartItems.productId, prodId));
          await tx.delete(wishlistItems).where(eq(wishlistItems.productId, prodId));
          await tx.delete(reviews).where(eq(reviews.productId, prodId));
          await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
          await tx.delete(products).where(eq(products.id, prodId));
        });
        appCache.invalidate('products');
        appCache.invalidate('categories');
        logAudit('product.delete', `bale-${userId}`, String(prodId));

        const backKb = new InlineKeyboard().text('⬅️ لیست محصولات', 'm:p:0').text('🏠 منوی اصلی', 'm:menu');
        await editOrReply(ctx, `🗑 کالا با شناسه ${prodId} با موفقیت حذف شد.`, backKb);
      } catch (err: any) {
        await ctx.reply(`❌ خطا در حذف کالا: ${err.message}`);
      }
      return;
    }

    // 3. Orders Management
    if (data.startsWith('m:o:')) {
      const page = parseInt(data.replace('m:o:', ''), 10) || 0;
      await showOrdersList(ctx, page);
      return;
    }

    if (data.startsWith('m:of:')) {
      const [, , status, pageStr] = data.split(':');
      const page = parseInt(pageStr, 10) || 0;
      await showOrdersList(ctx, page, status);
      return;
    }

    if (data.startsWith('o:v:')) {
      const orderId = data.replace('o:v:', '');
      await showOrderDetail(ctx, orderId);
      return;
    }

    if (data.startsWith('o:s:')) {
      const [, , orderId, nextStatus] = data.split(':');
      await updateOrderStatus(ctx, orderId, nextStatus, answerCb);
      return;
    }

    // 4. Coupons Management
    if (data.startsWith('m:cp_list:')) {
      const page = parseInt(data.replace('m:cp_list:', ''), 10) || 0;
      await showCouponsList(ctx, page);
      return;
    }

    if (data === 'm:cp_new') {
      session.mode = 'coupon_wizard';
      session.couponWizard = { step: 'code' };
      await editOrReply(ctx, '🏷 لطفاً *کد تخفیف انگلیسی* (مانند NOROOZ یا VIP20) را ارسال کنید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('cp:tog:')) {
      const code = data.replace('cp:tog:', '');
      const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
      if (existing) {
        const nextActive = !existing.active;
        await db.update(coupons).set({ active: nextActive }).where(eq(coupons.code, code));
        appCache.invalidate('coupons');
        logAudit('coupon.toggle', `bale-${userId}`, code, { active: nextActive });
        await answerCb(`وضعیت کوپن: ${nextActive ? 'فعال شد' : 'غیرفعال شد'}`);
        await showCouponsList(ctx, 0);
      }
      return;
    }

    if (data.startsWith('cp:del:')) {
      const code = data.replace('cp:del:', '');
      await db.delete(coupons).where(eq(coupons.code, code));
      appCache.invalidate('coupons');
      logAudit('coupon.delete', `bale-${userId}`, code);
      await answerCb(`کوپن ${code} حذف شد`);
      await showCouponsList(ctx, 0);
      return;
    }

    // 5. Reviews Moderation
    if (data.startsWith('m:rv_list:')) {
      const page = parseInt(data.replace('m:rv_list:', ''), 10) || 0;
      await showReviewsList(ctx, page);
      return;
    }

    if (data.startsWith('rv:app:')) {
      const revId = data.replace('rv:app:', '');
      await setReviewApproval(revId, true);
      logAudit('review.approve', `bale-${userId}`, revId);
      await answerCb('✅ نظر تأیید و امتیاز محصول بازمحاسبه شد');
      await showReviewsList(ctx, 0);
      return;
    }

    if (data.startsWith('rv:rej:')) {
      const revId = data.replace('rv:rej:', '');
      await setReviewApproval(revId, false);
      logAudit('review.reject', `bale-${userId}`, revId);
      await answerCb('❌ نظر رد شد و از نمایش خارج گردید');
      await showReviewsList(ctx, 0);
      return;
    }

    if (data.startsWith('rv:del:')) {
      const revId = data.replace('rv:del:', '');
      await setReviewApproval(revId, false);
      await db.delete(reviews).where(eq(reviews.id, revId));
      logAudit('review.delete', `bale-${userId}`, revId);
      await answerCb('🗑 نظر با موفقیت حذف شد');
      await showReviewsList(ctx, 0);
      return;
    }

    // 6. Contact Form Messages
    if (data.startsWith('m:cm_list:')) {
      const page = parseInt(data.replace('m:cm_list:', ''), 10) || 0;
      await showContactMessagesList(ctx, page);
      return;
    }

    if (data.startsWith('cm:read:')) {
      const msgId = data.replace('cm:read:', '');
      await db.update(contactMessages).set({ status: 'read' }).where(eq(contactMessages.id, msgId));
      await answerCb('پیام به عنوان خوانده‌شده علامت خورد');
      await showContactMessagesList(ctx, 0);
      return;
    }

    if (data.startsWith('cm:arc:')) {
      const msgId = data.replace('cm:arc:', '');
      await db.update(contactMessages).set({ status: 'archived' }).where(eq(contactMessages.id, msgId));
      await answerCb('پیام به آرشیو منتقل شد');
      await showContactMessagesList(ctx, 0);
      return;
    }

    // 7. Users & Loyalty
    if (data === 'm:usr_srch') {
      session.mode = 'search_user';
      await editOrReply(ctx, '🔍 شماره موبایل مشتری (مثلاً 09121234567) را ارسال فرمایید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('u:vip:')) {
      const [, , uId, ptsStr] = data.split(':');
      const pts = parseInt(ptsStr, 10);
      const usr = await db.query.users.findFirst({ where: eq(users.id, uId) });
      if (usr) {
        const newPts = (usr.vipPoints || 0) + pts;
        await db.update(users).set({ vipPoints: newPts }).where(eq(users.id, uId));
        logAudit('user.vip.gift', `bale-${userId}`, uId, { added: pts, total: newPts });
        await answerCb(`🎉 ${pts} امتیاز VIP اضافه شد. کل: ${newPts}`);
        await showUserDetail(ctx, uId);
      }
      return;
    }

    // 8. Website Settings
    if (data === 'st:bar_tog') {
      const cur = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarEnabled') }))?.value === 'true';
      const nxt = !cur;
      await db.insert(storeSettings).values({ key: 'announcementBarEnabled', value: String(nxt) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(nxt) } });
      appCache.invalidate('settings');
      logAudit('settings.announcement.toggle', `bale-${userId}`, 'announcementBarEnabled', { enabled: nxt });
      await answerCb(nxt ? '📢 نوار اعلان فعال شد' : 'نوار اعلان خاموش شد');
      await showSettingsMenu(ctx);
      return;
    }

    if (data === 'st:bar_txt') {
      session.mode = 'edit_announcement';
      const curTxt = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarText') }))?.value || '';
      await editOrReply(ctx, `📢 متن فعلی نوار اعلان:\n«${curTxt}»\n\nمتن جدید را بفرستید:`, makeCancelKeyboard());
      return;
    }

    if (data === 'st:ship_th') {
      session.mode = 'edit_free_shipping';
      const curTh = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'freeShippingThreshold') }))?.value || '500000';
      await editOrReply(ctx, `🚚 سقف فعلی ارسال رایگان: *${fmt(parseInt(curTh, 10) || 0)} تومان*\n\nمبلغ جدید (تومان) را ارسال نمایید:`, makeCancelKeyboard());
      return;
    }

    if (data === 'st:vip') {
      const vipKeys = ['vipBadge', 'vipTitle', 'vipSubtitle', 'vipCouponCode'] as const;
      const cur: Record<string, string> = {};
      for (const k of vipKeys) {
        cur[k] = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, k) }))?.value || STORE_SETTINGS_DEFAULTS[k] || '—';
      }
      await editOrReply(
        ctx,
        `🏷 *بنر باشگاه مشتریان (VIP)*\n\n` +
        `▫️ *برچسب:* «${cur.vipBadge}»\n` +
        `▫️ *عنوان:* «${cur.vipTitle}»\n` +
        `▫️ *زیرعنوان:* «${cur.vipSubtitle}»\n` +
        `▫️ *کد تخفیف:* \`${cur.vipCouponCode}\`\n\n` +
        `برای ویرایش هر یک، دکمه مربوطه را لمس کنید:`,
        makeVipBannerKeyboard()
      );
      return;
    }

    if (data.startsWith('st:vipf:')) {
      const fld = data.replace('st:vipf:', '');
      const map: Record<string, { key: 'vipBadge' | 'vipTitle' | 'vipSubtitle' | 'vipCouponCode'; label: string }> = {
        badge: { key: 'vipBadge', label: 'برچسب' },
        title: { key: 'vipTitle', label: 'عنوان' },
        subtitle: { key: 'vipSubtitle', label: 'زیرعنوان' },
        coupon: { key: 'vipCouponCode', label: 'کد تخفیف' },
      };
      const target = map[fld];
      if (!target) return;
      const curVal = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, target.key) }))?.value || STORE_SETTINGS_DEFAULTS[target.key] || '';
      session.mode = 'edit_vip_field';
      session.editingVipKey = target.key;
      await editOrReply(ctx, `✏️ *ویرایش ${target.label} بنر باشگاه مشتریان*\n\nمقدار فعلی:\n«${curVal}»\n\nمقدار جدید را بفرستید:`, makeCancelKeyboard());
      return;
    }
    } finally {
      // Bale docs: answerCallbackQuery is mandatory to dismiss loading spinner
      await answerCb();
    }
  });
}
