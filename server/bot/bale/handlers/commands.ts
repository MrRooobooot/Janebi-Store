/**
 * Slash commands (/start, /new, /upload, /cancel, /stats, /alerts, /orders, /list, /help).
 * Split out of server/bot/bale.ts (bodies moved verbatim).
 */
import { Bot } from 'grammy';
import type { BaleBotConfig } from '../types.js';
import { getSession, clearSession, isAdmin } from '../session.js';
import { makeMainMenuKeyboard, makeCancelKeyboard } from '../keyboards.js';
import { showProductsList, showOrdersList, showLowStockAlerts, showStoreStats, showHelp } from '../views.js';

export function registerCommandHandlers(bot: Bot, cfg: BaleBotConfig): void {
  // --- Main Menu Commands ---
  bot.command(['start', 'menu'], async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    clearSession(ctx.from!.id);
    await ctx.reply(
      '🛍 *سامانه مدیریت هوشمند Janebi Arena*\n\n' +
      'از دکمه‌های شیشه‌ای زیر جهت دسترسی سریع به بخش‌های فروشگاه استفاده کنید:',
      { reply_markup: makeMainMenuKeyboard() }
    );
  });

  bot.command('new', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    const s = getSession(ctx.from!.id);
    s.mode = 'wizard';
    s.wizard = { step: 'title', catPage: 0 };
    await ctx.reply('🏷 لطفاً *نام محصول جدید* را ارسال کنید:', { reply_markup: makeCancelKeyboard() });
  });

  bot.command(['upload', 'photo'], async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    const s = getSession(ctx.from!.id);
    s.mode = 'await_upload';
    await ctx.reply(
      '📸 *آپلود مستقیم عکس به سرور فروشگاه*\n\n' +
      'لطفاً عکس مورد نظر را در همین چت ارسال فرمایید (به صورت Photo یا فایل سند تصویری JPG/PNG/WebP):',
      { reply_markup: makeCancelKeyboard() }
    );
  });

  bot.command('cancel', async (ctx) => {
    clearSession(ctx.from!.id);
    await ctx.reply('عملیات لغو شد.', { reply_markup: makeMainMenuKeyboard() });
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showStoreStats(ctx);
  });

  bot.command('alerts', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showLowStockAlerts(ctx);
  });

  bot.command('orders', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showOrdersList(ctx, 0);
  });

  bot.command('list', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showProductsList(ctx, 0);
  });

  bot.command('help', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showHelp(ctx);
  });
}
