import mongoose from 'mongoose';
import AppError from './AppError.js';

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(value) {
  const term = String(value ?? '').trim();
  return term ? new RegExp(escapeRegex(term), 'i') : null;
}

export function isObjectId(value) {
  return typeof value === 'string' && mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value);
}

export function assertObjectId(value, label = 'id') {
  if (!isObjectId(value)) throw new AppError(`Invalid ${label}`, 400);
  return value;
}

export function toBoolean(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

export function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** Parses page/limit/sortBy/sortOrder from a query string. */
export function parseListQuery(query, { sortable = ['createdAt'], defaultSort = 'createdAt', defaultOrder = 'desc', maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const sortBy = sortable.includes(query.sortBy) ? query.sortBy : defaultSort;
  const order = (query.sortOrder ?? defaultOrder) === 'asc' ? 1 : -1;
  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder: order === 1 ? 'asc' : 'desc', sort: { [sortBy]: order, _id: order } };
}

export function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
}

/** Runs a paginated find and returns `{ items, pagination }`. */
export async function paginate(Model, filter, listQuery, { populate, select } = {}) {
  let cursor = Model.find(filter).sort(listQuery.sort).skip(listQuery.skip).limit(listQuery.limit);
  if (select) cursor = cursor.select(select);
  for (const item of [].concat(populate ?? [])) cursor = cursor.populate(item);
  const [items, total] = await Promise.all([cursor, Model.countDocuments(filter)]);
  return { items, pagination: paginationMeta(total, listQuery.page, listQuery.limit) };
}

export function parseIdList(value) {
  const ids = Array.isArray(value) ? value : [];
  if (!ids.length) throw new AppError('Select at least one item', 400);
  if (ids.length > 500) throw new AppError('Too many items selected', 400);
  ids.forEach((id) => assertObjectId(id));
  return ids;
}
