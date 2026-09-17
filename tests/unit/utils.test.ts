import { describe, it, expect } from 'vitest';
import { toPersianDigits, toEnglishDigits, normalizeIranianMobile, isValidIranianMobile, formatPrice } from '../../src/lib/utils';

describe('Utility Functions Unit Tests', () => {
  it('toPersianDigits converts English numbers to Persian digits', () => {
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
    expect(toPersianDigits('456')).toBe('۴۵۶');
  });

  it('toEnglishDigits converts Persian and Arabic digits to English digits', () => {
    expect(toEnglishDigits('۱۲۳۴۵')).toBe('12345');
    expect(toEnglishDigits('١٢٣٤٥')).toBe('12345');
    expect(toEnglishDigits('')).toBe('');
  });

  describe('normalizeIranianMobile', () => {
    it('normalizes standard 09 format', () => {
      expect(normalizeIranianMobile('09121234567')).toBe('09121234567');
    });

    it('normalizes Persian and Arabic numerals', () => {
      expect(normalizeIranianMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
      expect(normalizeIranianMobile('٠٩١٢١٢٣٤٥٦٧')).toBe('09121234567');
    });

    it('normalizes +98 international prefix', () => {
      expect(normalizeIranianMobile('+989121234567')).toBe('09121234567');
      expect(normalizeIranianMobile('+۹۸۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
    });

    it('normalizes 0098 prefix', () => {
      expect(normalizeIranianMobile('00989121234567')).toBe('09121234567');
      expect(normalizeIranianMobile('۰۰۹۸۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
    });

    it('normalizes 98 prefix (12 digits)', () => {
      expect(normalizeIranianMobile('989121234567')).toBe('09121234567');
    });

    it('normalizes 10-digit number without leading 0', () => {
      expect(normalizeIranianMobile('9121234567')).toBe('09121234567');
      expect(normalizeIranianMobile('۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
    });

    it('removes spaces, dashes, parentheses and slashes', () => {
      expect(normalizeIranianMobile('0912 123 4567')).toBe('09121234567');
      expect(normalizeIranianMobile('0912-123-4567')).toBe('09121234567');
      expect(normalizeIranianMobile('(0912) 123-4567')).toBe('09121234567');
      expect(normalizeIranianMobile('+98 (912) 123-4567')).toBe('09121234567');
    });

    it('handles empty or null-like inputs safely', () => {
      expect(normalizeIranianMobile('')).toBe('');
    });
  });

  it('isValidIranianMobile validates valid Iranian phone numbers', () => {
    expect(isValidIranianMobile('09121234567')).toBe(true);
    expect(isValidIranianMobile('+989121234567')).toBe(true);
    expect(isValidIranianMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe(true);
    expect(isValidIranianMobile('0912 123 4567')).toBe(true);
    expect(isValidIranianMobile('00989121234567')).toBe(true);
    expect(isValidIranianMobile('9121234567')).toBe(true);
  });

  it('isValidIranianMobile rejects invalid phone numbers', () => {
    expect(isValidIranianMobile('12345')).toBe(false);
    expect(isValidIranianMobile('08121234567')).toBe(false);
    expect(isValidIranianMobile('abc')).toBe(false);
    expect(isValidIranianMobile('')).toBe(false);
  });

  it.each([
    [0, '۰ تومان'],
    [10, '۱۰ تومان'],
    [50000, '۵۰٬۰۰۰ تومان'],
    [1234567890, '۱٬۲۳۴٬۵۶۷٬۸۹۰ تومان'],
    ['۱۲۳۴۵', '۱۲٬۳۴۵ تومان'],
    ['١٢٣٤٥', '۱۲٬۳۴۵ تومان'],
    [null, '۰ تومان'],
    [undefined, '۰ تومان'],
    ['', '۰ تومان'],
    ['invalid', '۰ تومان'],
  ])('formatPrice(%s) preserves the exact amount', (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });
});

