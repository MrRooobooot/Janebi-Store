import { Bot, GrammyError } from 'grammy';
import { initBaleNotifier } from './notifier.js';
import { BALE_API_ROOT } from './bale/constants.js';
import type { BaleBotConfig } from './bale/types.js';
import { registerCommandHandlers } from './bale/handlers/commands.js';
import { registerCallbackHandlers } from './bale/handlers/callbacks.js';
import { registerTextHandlers } from './bale/handlers/text.js';
import { registerMediaHandlers } from './bale/handlers/media.js';

// Moved into focused modules (bodies verbatim). Re-exported so every existing
// importer — including tests/unit/bale-bot.test.ts — keeps the same surface.
export * from './bale/constants.js';
export * from './bale/types.js';
export * from './bale/session.js';
export * from './bale/media.js';
export * from './bale/catalog.js';
export * from './bale/keyboards.js';

// -------------------------------------------------------------
// Core Bot Controller
// -------------------------------------------------------------
export async function startBaleBot(token: string, adminChatIds: number[]) {
  const bot = new Bot(token, { client: { apiRoot: BALE_API_ROOT } });
  const cfg: BaleBotConfig = { token, adminChatIds };

  // Resilient API client for Bale quirks: auto-retry on transient 500 / network errors
  bot.api.config.use(async (prev, method, payload, signal) => {
    const maxRetries = 3;
    let delay = 400;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await prev(method, payload, signal);
      } catch (err: any) {
        const isBale500 = err?.error_code === 500 || err?.description?.includes('Internal Server Error');
        const isNetworkErr = err?.name === 'FetchError' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
        const isRateLimit = err?.error_code === 429;

        if ((isBale500 || isNetworkErr || isRateLimit) && attempt < maxRetries) {
          console.warn(`[bale-bot] tapi.bale.ai transient error on ${method}, retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        // If sendMessage with reply_markup fails on final attempt, fallback to plain text without reply_markup
        if (method === 'sendMessage' && payload && (payload as any).reply_markup && attempt === maxRetries && isBale500) {
          try {
            console.warn(`[bale-bot] Retrying ${method} without reply_markup as final fallback...`);
            const fallbackPayload = { ...(payload as any) };
            delete fallbackPayload.reply_markup;
            return await prev(method, fallbackPayload, signal);
          } catch {}
        }

        throw err;
      }
    }
    return await prev(method, payload, signal);
  });

  // Initialize proactive event listener for live notifications
  initBaleNotifier(bot, adminChatIds);

  bot.catch((err) => {
    console.error('[bale-bot] error:', err instanceof GrammyError ? `${err.message} (${err.method})` : err);
  });

  registerCommandHandlers(bot, cfg);
  registerCallbackHandlers(bot, cfg);
  registerTextHandlers(bot, cfg);
  registerMediaHandlers(bot, cfg);


  // Polling initialization
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  bot.start({ onStart: () => console.log('✅ Bale bot polling @janebiarenabot with full inline controls') });

  return bot;
}
