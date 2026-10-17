/**
 * Free-text messages: wizard steps, searches and prompts.
 * Split out of server/bot/bale.ts (bodies moved verbatim).
 */
import { Bot, InlineKeyboard } from 'grammy';
import { eq, sql, like } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  products,
  coupons,
  storeSettings,
} from '../../../db/schema.js';
import { appCache } from '../../../utils/cache.js';
import type { BaleBotConfig } from '../types.js';
import { getSession, clearSession, fmt, fa2en, parsePrice, isAdmin, logAudit } from '../session.js';
import { getStoreCategories } from '../catalog.js';
import { makeMainMenuKeyboard, makeCancelKeyboard, makeCategoriesKeyboard, makeStockQuickKeyboard, makeBrandQuickKeyboard, makeWarrantyQuickKeyboard, makeDescriptionQuickKeyboard, makePhotoQuickKeyboard } from '../keyboards.js';
import { showProductConfirmation, showProductDetail, showCouponsList, showUserDetail, showSettingsMenu } from '../views.js';

export function registerTextHandlers(bot: Bot, cfg: BaleBotConfig): void {
  // --- Text Messages Handler ---
  bot.on('message:text', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const userId = ctx.from.id;
    const session = getSession(userId);
    const text = ctx.message.text.trim();

    // 1. Search Product
    if (session.mode === 'search') {
      session.mode = 'idle';
      const term = text.toLowerCase();
      const num = parsePrice(text);

      let idMatch = null;
      if (Number.isFinite(num) && num > 0) {
        idMatch = await db.query.products.findFirst({ where: eq(products.id, num) });
      }

      const results = await db
        .select()
        .from(products)
        .where(sql`lower(${products.title}) LIKE lower(${'%' + term + '%'}) OR lower(${products.sku}) LIKE lower(${'%' + term + '%'})`)
        .limit(6);

      const combined = idMatch
        ? [idMatch, ...results.filter((r) => r.id !== idMatch.id)].slice(0, 6)
        : results;

      if (combined.length === 0) {
        const kb = new InlineKeyboard().text('🔍 جستجوی مجدد', 'm:srch').text('🏠 منوی اصلی', 'm:menu');
        await ctx.reply(`❌ کالایی با عبارت یا شناسه «${text}» یافت نشد.`, { reply_markup: kb });
        return;
      }

      const kb = new InlineKeyboard();
      for (const p of combined) {
        const icon = p.stockQuantity === 0 ? '🔴' : p.stockQuantity <= 3 ? '🟡' : '📦';
        const shortTitle = p.title.length > 22 ? p.title.slice(0, 20) + '..' : p.title;
        kb.text(`${icon} ${shortTitle} | ${fmt(p.price)} ت (${fmt(p.stockQuantity)})`, `p:v:${p.id}`).row();
      }
      kb.text('🔍 جستجوی دیگر', 'm:srch').text('🏠 منوی اصلی', 'm:menu');
      await ctx.reply(`🔍 نتایج جستجو برای «${text}» (${combined.length} مورد):`, { reply_markup: kb });
      return;
    }

    // 2. Search Customer
    if (session.mode === 'search_user') {
      session.mode = 'idle';
      const phoneClean = fa2en(text).replace(/[^\d]/g, '');
      const u = await db.query.users.findFirst({
        where: phoneClean.length >= 4
          ? sql`phone LIKE ${'%' + phoneClean + '%'}`
          : sql`lower(name) LIKE lower(${'%' + text + '%'}) OR lower(email) LIKE lower(${'%' + text + '%'})`,
      });

      if (!u) {
        const kb = new InlineKeyboard().text('🔍 جستجوی مجدد', 'm:usr_srch').text('🏠 منوی اصلی', 'm:menu');
        await ctx.reply(`❌ کاربری با مشخصات «${text}» یافت نشد.`, { reply_markup: kb });
        return;
      }
      await showUserDetail(ctx, u.id);
      return;
    }

    // 3. Edit Price
    if (session.mode === 'edit_price' && session.editingProductId) {
      const newPrice = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        await ctx.reply('❌ مبلغ نامعتبر است. عدد به تومان وارد کنید:', { reply_markup: makeCancelKeyboard() });
        return;
      }

      await db.update(products).set({ price: newPrice }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.price.update', `bale-${userId}`, String(prodId), { price: newPrice });

      clearSession(userId);
      await ctx.reply(`✅ قیمت کالا به *${fmt(newPrice)} تومان* به‌روزرسانی شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 4. Edit Discount Percent
    if (session.mode === 'edit_discount' && session.editingProductId) {
      const rawDisc = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(rawDisc) || rawDisc < 0 || rawDisc > 99) {
        await ctx.reply('❌ درصد نامعتبر است. عددی بین ۰ تا ۹۹ بفرستید:', { reply_markup: makeCancelKeyboard() });
        return;
      }

      await db.update(products).set({ discount: rawDisc }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.discount.update', `bale-${userId}`, String(prodId), { discount: rawDisc });

      clearSession(userId);
      await ctx.reply(`✅ تخفیف کالا به *${fmt(rawDisc)}%* تنظیم شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 4.5. Edit Exact Stock Quantity
    if (session.mode === 'edit_stock' && session.editingProductId) {
      const newStock = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(newStock) || newStock < 0) {
        await ctx.reply('❌ تعداد نامعتبر است. لطفاً عدد مثبت یا صفر بفرستید:', {
          reply_markup: makeCancelKeyboard(),
        });
        return;
      }

      await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      appCache.invalidate('categories');
      appCache.invalidate(`product:${prodId}`);
      logAudit('product.stock.exact', `bale-${userId}`, String(prodId), { stock: newStock });

      clearSession(userId);
      await ctx.reply(`✅ موجودی کالا با موفقیت به *${fmt(newStock)} عدد* تنظیم شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 5. Coupon Creation Wizard
    if (session.mode === 'coupon_wizard' && session.couponWizard) {
      const cw = session.couponWizard;
      if (cw.step === 'code') {
        cw.code = text.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!cw.code) {
          await ctx.reply('کد نامعتبر است. فقط حروف انگلیسی و اعداد وارد کنید:');
          return;
        }
        cw.step = 'percent';
        await ctx.reply(`کد تخفیف: *${cw.code}*\n\nدرصد تخفیف (عدد ۱ تا ۹۰) را بفرستید:`, { reply_markup: makeCancelKeyboard() });
        return;
      }
      if (cw.step === 'percent') {
        const p = parsePrice(text);
        if (!Number.isFinite(p) || p <= 0 || p > 90) {
          await ctx.reply('درصد نامعتبر است. عددی بین ۱ تا ۹۰ بفرستید:');
          return;
        }
        cw.percent = p;
        cw.step = 'minTotal';
        await ctx.reply(`درصد: *${cw.percent}%*\n\nحداقل مبلغ خرید (تومان) برای این کوپن را وارد کنید (مثلاً ۱۰۰۰۰۰):`, { reply_markup: makeCancelKeyboard() });
        return;
      }
      if (cw.step === 'minTotal') {
        const mt = parsePrice(text);
        cw.minTotal = Number.isFinite(mt) && mt >= 0 ? mt : 0;
        try {
          await db.insert(coupons).values({
            code: cw.code!,
            percent: cw.percent!,
            minTotal: cw.minTotal,
            label: `${cw.percent}% تخفیف ویژه`,
            active: true,
            usedCount: 0,
          });
          appCache.invalidate('coupons');
          logAudit('coupon.create', `bale-${userId}`, cw.code!, { percent: cw.percent, minTotal: cw.minTotal });
          clearSession(userId);
          await ctx.reply(`🎉 کد تخفیف *${cw.code}* با موفقیت ایجاد و فعال گردید!`);
          await showCouponsList(ctx, 0);
        } catch (err: any) {
          await ctx.reply(`❌ خطا در ساخت کوپن: ${err.message}`, { reply_markup: makeMainMenuKeyboard() });
        }
        return;
      }
    }

    // 6. Announcement Bar Text
    if (session.mode === 'edit_announcement') {
      await db.insert(storeSettings).values({ key: 'announcementBarText', value: text })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: text } });
      appCache.invalidate('settings');
      clearSession(userId);
      await ctx.reply('✅ متن نوار اعلان با موفقیت به‌روزرسانی شد.');
      await showSettingsMenu(ctx);
      return;
    }

    // 7. Free Shipping Threshold
    if (session.mode === 'edit_free_shipping') {
      const th = parsePrice(text);
      if (!Number.isFinite(th) || th <= 0) {
        await ctx.reply('مبلغ نامعتبر است. عدد به تومان بفرستید:');
        return;
      }
      await db.insert(storeSettings).values({ key: 'freeShippingThreshold', value: String(th) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(th) } });
      appCache.invalidate('settings');
      clearSession(userId);
      await ctx.reply(`✅ سقف ارسال رایگان به *${fmt(th)} تومان* تغییر یافت.`);
      await showSettingsMenu(ctx);
      return;
    }

    // 7.5. VIP Banner Field Edit
    if (session.mode === 'edit_vip_field' && session.editingVipKey) {
      const key = session.editingVipKey;
      await db.insert(storeSettings).values({ key, value: text })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: text } });
      appCache.invalidate('settings');
      logAudit('settings.vip.update', `bale-${userId}`, key, { value: text.slice(0, 100) });
      clearSession(userId);
      await ctx.reply('✅ بنر باشگاه مشتریان با موفقیت به‌روزرسانی شد.');
      await showSettingsMenu(ctx);
      return;
    }

    // 8. Edit Product Photo via URL
    if (session.mode === 'edit_photo' && session.editingProductId) {
      const prodId = session.editingProductId;
      if (!/^(https?:\/\/|\/images\/)/i.test(text)) {
        await ctx.reply('❌ لطفاً عکس را مستقیماً ارسال فرمایید یا آدرس معتبر اینترنتی (URL) بفرستید:', {
          reply_markup: makeCancelKeyboard(),
        });
        return;
      }
      const [updated] = await db.update(products).set({ image: text }).where(eq(products.id, prodId)).returning();
      appCache.invalidate('products');
      appCache.invalidate('categories');
      appCache.invalidate(`product:${prodId}`);
      logAudit('product.edit_photo_url', `bale-${userId}`, String(prodId), { newImage: text });
      clearSession(userId);
      await ctx.reply(`✅ تصویر کالای *${updated?.title || prodId}* با موفقیت به‌روزرسانی شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 9. Assign Uploaded Photo to Product
    if (session.mode === 'assign_photo' && session.uploadedPhotoUrl) {
      const photoUrl = session.uploadedPhotoUrl;
      const num = parsePrice(text);
      let targetProduct = null;

      if (Number.isFinite(num) && num > 0) {
        targetProduct = await db.query.products.findFirst({ where: eq(products.id, num) });
      }

      if (targetProduct) {
        await db.update(products).set({ image: photoUrl }).where(eq(products.id, targetProduct.id));
        appCache.invalidate('products');
        appCache.invalidate('categories');
        appCache.invalidate(`product:${targetProduct.id}`);
        logAudit('product.assign_photo', `bale-${userId}`, String(targetProduct.id), { newImage: photoUrl });
        clearSession(userId);
        await ctx.reply(`✅ تصویر کالای *${targetProduct.title}* (شناسه ${targetProduct.id}) با موفقیت ثبت شد.`);
        await showProductDetail(ctx, targetProduct.id);
        return;
      }

      const matches = await db
        .select()
        .from(products)
        .where(like(products.title, `%${text}%`))
        .limit(5);

      if (matches.length === 0) {
        await ctx.reply(
          `🔍 کالایی با عبارت "${text}" یافت نشد.\nلطفاً شناسه عددی یا نام دیگری ارسال نمایید (یا دکمه انصراف را بزنید):`,
          { reply_markup: makeCancelKeyboard() }
        );
        return;
      }

      if (matches.length === 1) {
        const prod = matches[0];
        await db.update(products).set({ image: photoUrl }).where(eq(products.id, prod.id));
        appCache.invalidate('products');
        appCache.invalidate('categories');
        appCache.invalidate(`product:${prod.id}`);
        logAudit('product.assign_photo', `bale-${userId}`, String(prod.id), { newImage: photoUrl });
        clearSession(userId);
        await ctx.reply(`✅ تصویر کالای *${prod.title}* (شناسه ${prod.id}) با موفقیت ثبت شد.`);
        await showProductDetail(ctx, prod.id);
        return;
      }

      const kb = new InlineKeyboard();
      for (const m of matches) {
        kb.text(`📦 ${m.title.slice(0, 25)} (کد ${m.id})`, `p:set_img:${m.id}`).row();
      }
      kb.text('❌ انصراف', 'm:cancel');
      await ctx.reply('چند کالا با این عنوان پیدا شد. لطفاً کالای مورد نظر را انتخاب نمایید:', { reply_markup: kb });
      return;
    }

    // 8. Product Wizard
    if (session.mode === 'wizard' && session.wizard) {
      const d = session.wizard;
      switch (d.step) {
        case 'title': {
          d.title = text;
          d.step = 'category';
          d.catPage = 0;
          const cats = await getStoreCategories();
          await ctx.reply(`🏷 نام: *${d.title}*\n\n📁 لطفاً *دسته‌بندی محصول* را انتخاب کنید:`, {
            reply_markup: makeCategoriesKeyboard(cats, 0),
          });
          break;
        }

        case 'price': {
          const p = parsePrice(text);
          if (!Number.isFinite(p) || p <= 0) {
            await ctx.reply('❌ قیمت نامعتبر است. عدد به تومان وارد کنید (مثلاً: ۲۵۰,۰۰۰):', {
              reply_markup: makeCancelKeyboard(),
            });
            return;
          }
          d.price = p;
          d.step = 'stock';
          await ctx.reply(`💰 قیمت: *${fmt(p)} تومان*\n\n📦 *تعداد موجودی اولیه* را ارسال کنید یا انتخاب نمایید:`, {
            reply_markup: makeStockQuickKeyboard(),
          });
          break;
        }

        case 'stock': {
          const s = parsePrice(text);
          if (!Number.isFinite(s) || s < 0) {
            await ctx.reply('❌ موجودی نامعتبر است. عدد مثبت وارد کنید:', { reply_markup: makeStockQuickKeyboard() });
            return;
          }
          d.stock = s;
          d.step = 'brand';
          await ctx.reply(`📦 موجودی: *${fmt(s)} عدد*\n\n🏭 *برند کالا* را وارد کنید یا انتخاب نمایید:`, {
            reply_markup: makeBrandQuickKeyboard(),
          });
          break;
        }

        case 'brand': {
          d.brand = text || 'متفرقه';
          d.step = 'warranty';
          await ctx.reply(`🏭 برند: *${d.brand}*\n\n🛡 *نوع گارانتی* را ارسال کنید یا انتخاب نمایید:`, {
            reply_markup: makeWarrantyQuickKeyboard(),
          });
          break;
        }

        case 'warranty': {
          d.warranty = text || 'اصالت و سلامت فیزیکی';
          d.step = 'description';
          await ctx.reply(`🛡 گارانتی: *${d.warranty}*\n\n📝 *توضیحات کالا* را ارسال کنید (یا دکمه رد شدن):`, {
            reply_markup: makeDescriptionQuickKeyboard(),
          });
          break;
        }

        case 'description': {
          d.description = text;
          if (d.photoUrl) {
            d.step = 'confirm';
            await showProductConfirmation(ctx, d);
            break;
          }
          d.step = 'photo';
          await ctx.reply(
            '📝 توضیحات ذخیره شد.\n\n' +
            '🖼 *تصویر محصول* را بفرستید:\n' +
            'عکس را مستقیماً در همین چت ارسال کنید، یا آدرس اینترنتی (URL) آن را بفرستید، یا دکمه تصویر پیش‌فرض را بزنید:',
            { reply_markup: makePhotoQuickKeyboard() }
          );
          break;
        }

        case 'photo': {
          if (!/^(https?:\/\/|\/images\/)/i.test(text)) {
            await ctx.reply('❌ لینک نامعتبر است. آدرس اینترنتی معتبر بفرستید یا عکس را مستقیماً ارسال فرمایید:', {
              reply_markup: makePhotoQuickKeyboard(),
            });
            return;
          }
          d.photoUrl = text;
          d.step = 'confirm';
          await showProductConfirmation(ctx, d);
          break;
        }

        default:
          await ctx.reply('برای شروع از /menu استفاده نمایید.', { reply_markup: makeMainMenuKeyboard() });
          break;
      }
      return;
    }

    await ctx.reply('دستور نامشخص. از دکمه‌های زیر استفاده نمایید:', { reply_markup: makeMainMenuKeyboard() });
  });
}
