import { getLocale, t } from '../i18n/index.js';

let currency = { code: 'BDT', symbol: '৳' };

export function setCurrency(code, symbol) {
  currency = { code: code || 'BDT', symbol: symbol || code || '৳' };
}

export function money(value, { compact = false } = {}) {
  const number = Number(value) || 0;
  const formatted = new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : (Number.isInteger(number) ? 0 : 2),
    notation: compact ? 'compact' : 'standard',
  }).format(number);
  return `${currency.symbol}${formatted}`;
}

export function number(value, { compact = false } = {}) {
  return new Intl.NumberFormat(getLocale(), { notation: compact ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

export function date(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat(getLocale(), options).format(parsed);
}

export function dateTime(value) {
  return date(value, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(value) {
  if (!value) return '';
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return t('just now');
}

export function titleCase(value = '') {
  return t(String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

/** Formats chart bucket keys (YYYY-MM, YYYY-MM-DD, YYYY-MM-DD HH:00). */
export function bucketLabel(key, granularity) {
  if (!key) return '';
  if (granularity === 'hour') return new Date(`${key.replace(' ', 'T')}:00`).toLocaleTimeString(getLocale(), { hour: 'numeric' });
  const [year, month, day] = key.split(/[- ]/).map(Number);
  if (granularity === 'month') return new Date(year, month - 1, 1).toLocaleString(getLocale(), { month: 'short', year: '2-digit' });
  return new Date(year, month - 1, day).toLocaleString(getLocale(), { day: 'numeric', month: 'short' });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 'Jan' (from the API) → short month name in the current language. */
export function monthLabel(short) {
  const index = MONTHS.indexOf(short);
  return index < 0 ? short : new Date(2000, index, 1).toLocaleString(getLocale(), { month: 'short' });
}

export function imageUrl(path) {
  return path || '';
}

/** Label maps are translated on read, so `ROLE_LABELS.admin` and `Object.entries(...)` follow the language. */
const translated = (labels) => new Proxy(labels, { get: (target, key) => (typeof target[key] === 'string' ? t(target[key]) : target[key]) });

export const ROLE_LABELS = translated({ superadmin: 'Super Administrator', admin: 'Administrator', user: 'Customer' });
export const PAYMENT_METHOD_LABELS = translated({
  cash_on_delivery: 'Cash on delivery', card: 'Card', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank_transfer: 'Bank transfer', other: 'Other',
});
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
