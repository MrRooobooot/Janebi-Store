/**
 * Formats numbers into Persian digits (e.g. 123 -> ۱۲۳)
 */
export function toPersianDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

/**
 * Converts Persian and Arabic digits to ASCII English digits
 */
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Normalizes an Iranian mobile phone number:
 * - Converts Persian and Arabic numerals to ASCII digits
 * - Removes spaces, dashes, parentheses, dots, slashes, etc.
 * - Strips leading +98, 0098, 98 (12 digits), or adds leading 0 (10 digits starting with 9)
 * - Formats standard Iranian mobile as 09xxxxxxxxx (11 digits)
 */
export function normalizeIranianMobile(phone: string): string {
  if (!phone) return '';
  let cleaned = toEnglishDigits(phone.trim());
  cleaned = cleaned.replace(/[\s\-()./\\]/g, '');

  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Validates Iranian mobile numbers supporting Persian/Arabic digits, spaces, dashes, +98/0098/0 prefixes
 */
export function isValidIranianMobile(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizeIranianMobile(phone);
  return /^09\d{9}$/.test(normalized);
}

/**
 * Formats prices in Tomans with Persian digits and localized separators
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') return '۰ تومان';
  const num = typeof price === 'string' ? parseFloat(toEnglishDigits(price)) : price;
  if (isNaN(num)) return '۰ تومان';
  return `${toPersianDigits(num.toLocaleString('fa-IR'))} تومان`;
}

/**
 * Formats raw amount to Persian digits with thousands separator without currency suffix
 */
export function formatTomanNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '۰';
  const num = typeof amount === 'string' ? parseFloat(toEnglishDigits(amount)) : amount;
  if (isNaN(num)) return '۰';
  return toPersianDigits(num.toLocaleString('fa-IR'));
}

/**
 * Formats ISO or timestamp date string to Persian Jalali calendar format
 */
export function formatPersianDate(dateInput: string | Date | number, includeTime: boolean = false): string {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
