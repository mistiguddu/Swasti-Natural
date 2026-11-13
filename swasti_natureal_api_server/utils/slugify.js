import { randomBytes } from 'node:crypto';
import { escapeRegex } from './query.js';

export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Returns a slug that no other document of `Model` uses (appends -2, -3, … when needed). */
export async function uniqueSlug(Model, source, excludeId) {
  const base = slugify(source) || randomBytes(4).toString('hex');
  const filter = { slug: new RegExp(`^${escapeRegex(base)}(-\\d+)?$`) };
  if (excludeId) filter._id = { $ne: excludeId };
  const taken = new Set((await Model.find(filter).select('slug').lean()).map((doc) => doc.slug));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

export function generateCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${randomBytes(2).toString('hex').toUpperCase()}`;
}
