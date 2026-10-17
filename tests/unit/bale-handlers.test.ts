import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { Bot } from 'grammy';
import { startBaleBot, getSession, clearSession } from '../../server/bot/bale.js';

// grammy talks to Bale through its own fetch binding, so a global stub would not catch it.
// Instead every Bot gets an innermost API transformer that answers locally and never calls
// through to the network; the bot's own retry transformer still wraps it as in production.
const fake = vi.hoisted(() => ({
  handler: (async () => ({ ok: true, result: true })) as (method: string, payload: any) => Promise<any>,
}));
vi.mock('grammy', async (importOriginal) => {
  const real = await importOriginal<typeof import('grammy')>();
  class OfflineBot extends real.Bot<any> {
    constructor(token: string, config?: any) {
      super(token, config);
      this.api.config.use((async (_prev: any, method: string, payload: any) => fake.handler(method, payload)) as any);
    }
  }
  return { ...real, Bot: OfflineBot };
});

// Characterization of the Bale admin bot's update handlers. The bot is driven through
// grammy's handleUpdate with a faked fetch, so no network is touched and every Bale API
// call it makes is recorded. These pin today's behaviour so the file can be split
// without changing it.

const ADMIN = 424242;
const STRANGER = 111;
const TOKEN = '123456:TEST';

interface ApiCall {
  method: string;
  payload: Record<string, any>;
}

let calls: ApiCall[] = [];
let bot: Bot;
let updateId = 1;

const chat = (id: number) => ({ id, type: 'private' as const });
const from = (id: number) => ({ id, is_bot: false, first_name: 'T' });

async function sendCommand(userId: number, text: string) {
  await bot.handleUpdate({
    update_id: updateId++,
    message: {
      message_id: updateId,
      date: 1,
      chat: chat(userId),
      from: from(userId),
      text,
      entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
    },
  } as any);
}

async function sendText(userId: number, text: string) {
  await bot.handleUpdate({
    update_id: updateId++,
    message: { message_id: updateId, date: 1, chat: chat(userId), from: from(userId), text },
  } as any);
}

async function press(userId: number, data: string) {
  await bot.handleUpdate({
    update_id: updateId++,
    callback_query: {
      id: String(updateId),
      from: from(userId),
      chat_instance: 'ci',
      data,
      message: { message_id: 7, date: 1, chat: chat(userId), text: 'menu' },
    },
  } as any);
}

const callsOf = (method: string) => calls.filter((c) => c.method === method);
const lastText = () => {
  const c = [...calls].reverse().find((x) => x.method === 'sendMessage' || x.method === 'editMessageText');
  return String(c?.payload.text ?? '');
};

beforeAll(async () => {
  fake.handler = async (method, payload) => {
    calls.push({ method, payload });
    const result =
      method === 'getMe'
        ? { id: 1, is_bot: true, first_name: 'bot', username: 'testbot' }
        : method === 'sendMessage'
          ? { message_id: 99, date: 1, chat: chat(ADMIN), text: payload.text }
          : true;
    return { ok: true, result };
  };
  // No polling loop in tests.
  vi.spyOn(Bot.prototype, 'start').mockImplementation((() => Promise.resolve()) as any);
  bot = await startBaleBot(TOKEN, [ADMIN]);
  await bot.init();
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  calls = [];
  clearSession(ADMIN);
  clearSession(STRANGER);
});

describe('startBaleBot', () => {
  it('clears any webhook and starts polling', async () => {
    expect(Bot.prototype.start).toHaveBeenCalled();
  });
});

describe('access control', () => {
  it('turns a non-admin away from /start', async () => {
    await sendCommand(STRANGER, '/start');
    expect(callsOf('sendMessage')).toHaveLength(1);
    expect(lastText()).toContain('⛔');
  });

  it('ignores a non-admin typing text (no reply at all)', async () => {
    await sendText(STRANGER, 'سلام');
    expect(callsOf('sendMessage')).toHaveLength(0);
  });

  it('answers a non-admin button press with an alert and nothing else', async () => {
    await press(STRANGER, 'm:menu');
    const answers = callsOf('answerCallbackQuery');
    expect(answers).toHaveLength(1);
    expect(answers[0].payload.show_alert).toBe(true);
    expect(callsOf('editMessageText')).toHaveLength(0);
  });
});

describe('commands', () => {
  it('/start shows the main menu with a keyboard and resets the session', async () => {
    getSession(ADMIN).mode = 'wizard';
    await sendCommand(ADMIN, '/start');
    const sent = callsOf('sendMessage');
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.reply_markup).toBeTruthy();
    expect(getSession(ADMIN).mode).not.toBe('wizard');
  });

  it('/help replies with the dashboard guide', async () => {
    await sendCommand(ADMIN, '/help');
    expect(lastText()).toContain('راهنمای داشبورد');
  });

  it('/stats replies with store statistics', async () => {
    await sendCommand(ADMIN, '/stats');
    expect(lastText()).toContain('کل فروش موفق');
  });
});

describe('callback buttons', () => {
  it('m:menu edits the message to the main menu and dismisses the spinner', async () => {
    await press(ADMIN, 'm:menu');
    expect(callsOf('answerCallbackQuery').length).toBeGreaterThanOrEqual(1);
    expect(callsOf('editMessageText')).toHaveLength(1);
    expect(lastText()).toContain('سامانه مدیریت');
  });

  it.each([
    ['m:sec_prod', 'مدیریت کالاها'],
    ['m:help', 'راهنمای داشبورد'],
    ['m:stat', 'کل فروش موفق'],
  ])('%s renders its section', async (data, marker) => {
    await press(ADMIN, data);
    expect(lastText()).toContain(marker);
  });

  it('m:new starts the product wizard', async () => {
    await press(ADMIN, 'm:new');
    const s = getSession(ADMIN);
    expect(s.mode).toBe('wizard');
    expect(s.wizard?.step).toBe('title');
    expect(lastText()).toContain('نام محصول جدید');
  });

  it('m:cancel drops the wizard', async () => {
    await press(ADMIN, 'm:new');
    await press(ADMIN, 'm:cancel');
    expect(getSession(ADMIN).mode).not.toBe('wizard');
    expect(lastText()).toContain('لغو شد');
  });
});

describe('text messages', () => {
  it('without an active flow gives the unknown-command hint with the main menu', async () => {
    await sendText(ADMIN, 'سلام');
    expect(lastText()).toContain('دستور نامشخص');
    expect(callsOf('sendMessage').pop()!.payload.reply_markup).toBeTruthy();
  });

  it('inside the wizard, the first text becomes the title and moves to the next step', async () => {
    await press(ADMIN, 'm:new');
    await sendText(ADMIN, 'کابل آزمایشی');
    const s = getSession(ADMIN);
    expect(s.mode).toBe('wizard');
    expect(s.wizard?.step).not.toBe('title');
  });
});

describe('media', () => {
  it('rejects a document that is not an image', async () => {
    await bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: updateId,
        date: 1,
        chat: chat(ADMIN),
        from: from(ADMIN),
        document: { file_id: 'f1', file_unique_id: 'u1', file_name: 'x.pdf', mime_type: 'application/pdf' },
      },
    } as any);
    expect(lastText()).toContain('تصویر معتبر نیست');
  });

  it('ignores a non-admin photo', async () => {
    await bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: updateId,
        date: 1,
        chat: chat(STRANGER),
        from: from(STRANGER),
        photo: [{ file_id: 'p', file_unique_id: 'pu', width: 1, height: 1 }],
      },
    } as any);
    expect(calls.filter((c) => c.method !== 'getMe')).toHaveLength(0);
  });
});
