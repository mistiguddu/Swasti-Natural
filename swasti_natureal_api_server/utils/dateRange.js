import AppError from './AppError.js';

export const TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDay(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) throw new AppError(`${label} must be a date in YYYY-MM-DD format`, 400);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} is not a valid date`, 400);
  return date;
}

/**
 * Resolves `range` (today | 7d | 30d | month | year | custom) plus `from`/`to`
 * into the current period, the previous period of equal length, and a chart granularity.
 */
export function resolveDateRange(query = {}, fallback = '30d') {
  const range = query.range || (query.from || query.to ? 'custom' : fallback);
  const now = new Date();
  let start;
  let end = now;

  switch (range) {
    case 'today': start = startOfDay(now); break;
    case '7d': start = startOfDay(new Date(now.getTime() - 6 * DAY)); break;
    case '30d': start = startOfDay(new Date(now.getTime() - 29 * DAY)); break;
    case '90d': start = startOfDay(new Date(now.getTime() - 89 * DAY)); break;
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'year': start = new Date(now.getFullYear(), 0, 1); break;
    case 'all': start = new Date(2000, 0, 1); break;
    case 'custom': {
      start = startOfDay(parseDay(query.from, 'from'));
      end = endOfDay(parseDay(query.to ?? query.from, 'to'));
      if (end < start) throw new AppError('The end date must be after the start date', 400);
      if (end - start > 3 * 366 * DAY) throw new AppError('Custom ranges are limited to 3 years', 400);
      break;
    }
    default: throw new AppError('range must be one of today, 7d, 30d, 90d, month, year, all or custom', 400);
  }

  const length = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - length - 1);
  const days = length / DAY;
  const granularity = range === 'today' || days <= 1 ? 'hour' : days <= 92 ? 'day' : 'month';
  return { range, start, end, prevStart, prevEnd, granularity, timezone: TIMEZONE };
}

export function percentChange(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const pad = (value) => String(value).padStart(2, '0');

function bucketKey(date, granularity) {
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  if (granularity === 'month') return base;
  if (granularity === 'day') return `${base}-${pad(date.getDate())}`;
  return `${base}-${pad(date.getDate())} ${pad(date.getHours())}:00`;
}

/** Mongo $dateToString format matching bucketKey(). */
export function mongoDateFormat(granularity) {
  return { month: '%Y-%m', day: '%Y-%m-%d', hour: '%Y-%m-%d %H:00' }[granularity];
}

/** Every bucket key between start and end, so charts have no gaps. */
export function bucketKeys(start, end, granularity) {
  const keys = [];
  const cursor = new Date(start);
  if (granularity === 'month') cursor.setDate(1);
  if (granularity !== 'hour') cursor.setHours(0, 0, 0, 0);
  else cursor.setMinutes(0, 0, 0);
  while (cursor <= end && keys.length < 2000) {
    keys.push(bucketKey(cursor, granularity));
    if (granularity === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else if (granularity === 'day') cursor.setDate(cursor.getDate() + 1);
    else cursor.setHours(cursor.getHours() + 1);
  }
  return keys;
}

/** Fills missing buckets with zeros. `rows` items must have `_id` = bucket key. */
export function fillSeries(rows, start, end, granularity, fields) {
  const byKey = new Map(rows.map((row) => [row._id, row]));
  return bucketKeys(start, end, granularity).map((key) => {
    const row = byKey.get(key) ?? {};
    return { date: key, ...Object.fromEntries(fields.map((field) => [field, Math.round((row[field] ?? 0) * 100) / 100])) };
  });
}
