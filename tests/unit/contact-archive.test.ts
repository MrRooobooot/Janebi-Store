import { describe, it, expect } from 'vitest';
import { ARCHIVE_AFTER_DAYS } from '../../src/lib/constants';

/**
 * Contact-messages archive policy (audit §3.12).
 *
 * The canonical status allow-list is enforced in two places:
 *  - server/routes/admin.ts PUT /contact-messages/:id/status (strict status)
 *  - server/routes/admin.ts GET  /contact-messages           (?status= filter)
 * Both must stay in sync with the list tested here.
 */
const ALLOWED_STATUSES = ['unread', 'read', 'resolved', 'archived'];
const ALLOWED_FILTERS = [...ALLOWED_STATUSES, 'all'];

const isValidStatus = (s: unknown) => ALLOWED_STATUSES.includes(s as string);
const filterMessages = (messages: { status: string }[], status?: string) => {
  const f = typeof status === 'string' && status ? status : '';
  if (f && !ALLOWED_FILTERS.includes(f)) return { error: true as const, messages: [] };
  if (f && f !== 'all') return { error: false as const, messages: messages.filter((m) => m.status === f) };
  if (f === 'all') return { error: false as const, messages: [...messages] };
  return { error: false as const, messages: messages.filter((m) => m.status !== 'archived') };
};

describe('contact archive policy', () => {
  it('ARCHIVE_AFTER_DAYS is 90 and shared single-source', () => {
    expect(ARCHIVE_AFTER_DAYS).toBe(90);
  });

  it('accepts the strict status set including archived', () => {
    expect(isValidStatus('archived')).toBe(true);
    expect(isValidStatus('unread')).toBe(true);
    expect(isValidStatus('read')).toBe(true);
    expect(isValidStatus('resolved')).toBe(true);
  });

  it('rejects invalid / forged statuses', () => {
    expect(isValidStatus('deleted')).toBe(false);
    expect(isValidStatus('ARCHIVED')).toBe(false);
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
    // Prototype-pollution style keys must not pass
    expect(isValidStatus('__proto__')).toBe(false);
    expect(isValidStatus('constructor')).toBe(false);
  });

  it('default filter hides archived messages', () => {
    const messages = [
      { status: 'unread' },
      { status: 'read' },
      { status: 'archived' },
    ];
    const res = filterMessages(messages);
    expect(res.error).toBe(false);
    expect(res.messages).toHaveLength(2);
    expect(res.messages.every((m) => m.status !== 'archived')).toBe(true);
  });

  it('explicit status=archived returns only archived rows', () => {
    const messages = [
      { status: 'unread' },
      { status: 'archived' },
      { status: 'archived' },
    ];
    const res = filterMessages(messages, 'archived');
    expect(res.error).toBe(false);
    expect(res.messages).toHaveLength(2);
    expect(res.messages.every((m) => m.status === 'archived')).toBe(true);
  });

  it('status=all returns everything including archived', () => {
    const messages = [{ status: 'unread' }, { status: 'archived' }];
    const res = filterMessages(messages, 'all');
    expect(res.error).toBe(false);
    expect(res.messages).toHaveLength(2);
  });

  it('rejects invalid status filters', () => {
    expect(filterMessages([{ status: 'read' }], 'bogus').error).toBe(true);
    expect(filterMessages([{ status: 'read' }], '__proto__').error).toBe(true);
  });
});
