/**
 * Photo and image-document uploads.
 * Split out of server/bot/bale.ts (bodies moved verbatim).
 */
import { Bot, InlineKeyboard, type Context } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  products,
} from '../../../db/schema.js';
import { appCache } from '../../../utils/cache.js';
import type { BaleBotConfig } from '../types.js';
import { getSession, clearSession, isAdmin, logAudit } from '../session.js';
import { downloadAndSaveBalePhoto } from '../media.js';
import { makeCancelKeyboard } from '../keyboards.js';
import { showProductConfirmation, showProductDetail } from '../views.js';

export function registerMediaHandlers(bot: Bot, cfg: BaleBotConfig): void {
  // --- Photo & Document Image Upload Handler ---
  async function handleIncomingImage(ctx: Context, fileId: string): Promise<void> {
    if (!isAdmin(ctx, cfg)) return;
    const userId = ctx.from!.id;
    const session = getSession(userId);

    const waitMsg = await ctx.reply('⏳ در حال دریافت و پردازش تصویر...');
    try {
      const fileInfo = await bot.api.getFile(fileId);
      if (!fileInfo.file_path) throw new Error('مسیر فایل از سرور بله دریافت نشد');

      const localUrl = await downloadAndSaveBalePhoto(cfg.token, fileInfo.file_path);

      try {
        if (ctx.chat) await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id);
      } catch (delErr) {
        console.warn('[bale-bot] failed to delete wait message:', delErr);
      }

      // Case 1: In creation wizard
      if (session.mode === 'wizard' && session.wizard && session.wizard.step === 'photo') {
        session.wizard.photoUrl = localUrl;
        session.wizard.step = 'confirm';
        await showProductConfirmation(ctx, session.wizard);
        return;
      }

      // Case 2: Editing existing product photo
      if (session.mode === 'edit_photo' && session.editingProductId) {
        const prodId = session.editingProductId;
        const [updated] = await db.update(products).set({ image: localUrl }).where(eq(products.id, prodId)).returning();
        appCache.invalidate('products');
        appCache.invalidate('categories');
        appCache.invalidate(`product:${prodId}`);
        logAudit('product.edit_photo', `bale-${userId}`, String(prodId), { newImage: localUrl });
        clearSession(userId);

        await ctx.reply(
          `✅ *تصویر کالا با موفقیت به‌روزرسانی شد!*\n\n` +
          `▫️ کالا: *${updated?.title || prodId}*\n` +
          `▫️ آدرس تصویر: \`${localUrl}\``
        );
        await showProductDetail(ctx, prodId);
        return;
      }

      // Case 3: Standalone / Direct upload (idle, await_upload, or any other state)
      session.uploadedPhotoUrl = localUrl;
      const kb = new InlineKeyboard()
        .text('➕ ساخت کالای جدید با این عکس', 'w:new:img')
        .row()
        .text('🔄 اتصال به کالای موجود', 'p:asg:img')
        .row()
        .text('🏠 منوی اصلی', 'm:menu');

      await ctx.reply(
        `📸 *تصویر با موفقیت در سرور فروشگاه ذخیره شد!*\n\n` +
        `▫️ *آدرس ذخیره‌شده:* \`${localUrl}\`\n` +
        `▫️ *لینک مستقیم وب‌سایت:* \`https://janebiarena.ir${localUrl}\`\n\n` +
        `جهت استفاده از این تصویر، یکی از گزینه‌های زیر را انتخاب فرمایید:`,
        { reply_markup: kb }
      );
    } catch (err: any) {
      try {
        if (ctx.chat) await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id);
      } catch (delErr) {
        console.warn('[bale-bot] failed to delete wait message on error path:', delErr);
      }
      await ctx.reply(`❌ خطا در پردازش و ذخیره تصویر: ${err.message}\nلطفاً فرمت فایل (JPG, PNG, WebP) را بررسی نموده و دوباره امتحان فرمایید.`);
    }
  }

  bot.on('message:photo', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    await handleIncomingImage(ctx, best.file_id);
  });

  bot.on('message:document', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const doc = ctx.message.document;
    const mime = doc.mime_type || '';
    const name = doc.file_name?.toLowerCase() || '';
    const isImg =
      mime.startsWith('image/') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp');

    if (!isImg) {
      await ctx.reply('❌ فایل ارسالی تصویر معتبر نیست. لطفاً عکس با فرمت JPG، PNG یا WebP ارسال فرمایید.', {
        reply_markup: makeCancelKeyboard(),
      });
      return;
    }

    await handleIncomingImage(ctx, doc.file_id);
  });
}
