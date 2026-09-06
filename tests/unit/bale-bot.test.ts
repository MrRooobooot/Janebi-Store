import { describe, it, expect } from 'vitest';
import {
  fa2en,
  parsePrice,
  fmt,
  makeMainMenuKeyboard,
  makeProductsSectionKeyboard,
  makeOrdersSectionKeyboard,
  makeCouponsSectionKeyboard,
  makeMessagesSectionKeyboard,
  makeUsersSectionKeyboard,
  makeSettingsSectionKeyboard,
  makeCategoriesKeyboard,
  makeStockQuickKeyboard,
  makeBrandQuickKeyboard,
  makeWarrantyQuickKeyboard,
  makeProductDetailKeyboard,
  makeProductDeleteConfirmKeyboard,
  makeOrderDetailKeyboard,
  getSession,
  clearSession,
  sessions,
  DEFAULT_CATEGORIES,
} from '../../server/bot/bale.js';

describe('Bale Bot Helpers & Keyboard Byte Budget Tests', () => {
  describe('fa2en digit conversion', () => {
    it('converts Persian digits to English', () => {
      expect(fa2en('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('converts Eastern Arabic digits to English', () => {
      expect(fa2en('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    });

    it('leaves standard English strings intact', () => {
      expect(fa2en('12345')).toBe('12345');
    });
  });

  describe('parsePrice', () => {
    it('parses English digits with commas', () => {
      expect(parsePrice('350,000')).toBe(350000);
    });

    it('parses Persian digits with commas and text', () => {
      expect(parsePrice('قیمت: ۲۵۰,۰۰۰ تومان')).toBe(250000);
    });

    it('returns NaN for string with no digits', () => {
      expect(Number.isNaN(parsePrice('تومان'))).toBe(true);
    });
  });

  describe('fmt', () => {
    it('formats numbers using Persian locale', () => {
      const formatted = fmt(1000);
      expect(formatted).toContain('۱');
    });
  });

  describe('Bale Bot API Constraints: callback_data <= 64 bytes', () => {
    function assertAllButtonsUnder64Bytes(kb: any) {
      const buttons = kb.inline_keyboard as Array<Array<{ text: string; callback_data?: string; url?: string }>>;
      expect(buttons.length).toBeGreaterThan(0);
      for (const row of buttons) {
        for (const btn of row) {
          if (btn.callback_data) {
            const byteLen = Buffer.byteLength(btn.callback_data, 'utf8');
            expect(byteLen).toBeLessThanOrEqual(64);
          }
        }
      }
    }

    it('mainMenuKeyboard satisfies <= 64 bytes limit', () => {
      assertAllButtonsUnder64Bytes(makeMainMenuKeyboard());
    });

    it('section keyboards satisfy <= 64 bytes limit', () => {
      assertAllButtonsUnder64Bytes(makeProductsSectionKeyboard());
      assertAllButtonsUnder64Bytes(makeOrdersSectionKeyboard());
      assertAllButtonsUnder64Bytes(makeCouponsSectionKeyboard());
      assertAllButtonsUnder64Bytes(makeMessagesSectionKeyboard());
      assertAllButtonsUnder64Bytes(makeUsersSectionKeyboard());
      assertAllButtonsUnder64Bytes(makeSettingsSectionKeyboard(true));
      assertAllButtonsUnder64Bytes(makeSettingsSectionKeyboard(false));
    });

    it('categoriesKeyboard satisfies <= 64 bytes limit across pages and prefixes', () => {
      const kb0 = makeCategoriesKeyboard(DEFAULT_CATEGORIES, 0);
      assertAllButtonsUnder64Bytes(kb0);

      const kb1 = makeCategoriesKeyboard(DEFAULT_CATEGORIES, 1);
      assertAllButtonsUnder64Bytes(kb1);

      const kbp = makeCategoriesKeyboard(DEFAULT_CATEGORIES, 0, 'cpk:cat:');
      assertAllButtonsUnder64Bytes(kbp);
    });

    it('quick keyboards satisfy <= 64 bytes limit', () => {
      assertAllButtonsUnder64Bytes(makeStockQuickKeyboard());
      assertAllButtonsUnder64Bytes(makeBrandQuickKeyboard());
      assertAllButtonsUnder64Bytes(makeWarrantyQuickKeyboard());
    });

    it('productDetailKeyboard and delete confirm satisfy <= 64 bytes limit', () => {
      assertAllButtonsUnder64Bytes(makeProductDetailKeyboard(12345, 10));
      assertAllButtonsUnder64Bytes(makeProductDeleteConfirmKeyboard(12345));
    });

    it('orderDetailKeyboard satisfies <= 64 bytes limit', () => {
      assertAllButtonsUnder64Bytes(makeOrderDetailKeyboard('ORD-XYZ12345-AB'));
    });
  });

  describe('Session Lifecycle', () => {
    it('initializes and clears user sessions', () => {
      const userId = 888888;
      clearSession(userId);
      expect(sessions.has(userId)).toBe(false);

      const s = getSession(userId);
      expect(s.mode).toBe('idle');
      expect(sessions.has(userId)).toBe(true);

      clearSession(userId);
      expect(sessions.has(userId)).toBe(false);
    });
  });
});
