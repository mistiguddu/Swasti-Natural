import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';
import { generateCode, uniqueSlug } from '../utils/slugify.js';
import { assertObjectId, isObjectId, paginate, parseIdList, parseListQuery, searchRegex, toBoolean } from '../utils/query.js';
import { publicPath } from '../config/upload.js';
import { deleteUnusedFiles } from './file.service.js';
import { notify } from './notification.service.js';

const FOLDER = 'categories';
const SORTABLE = ['name', 'code', 'createdAt', 'updatedAt', 'displayOrder'];

/** Number of products in each category (as main category or subcategory). */
export async function productCounts(categoryIds) {
  const ids = categoryIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  if (!ids.length) return new Map();
  const rows = await Product.aggregate([
    { $match: { $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] } },
    { $project: { cats: { $setUnion: [['$category'], { $cond: [{ $ifNull: ['$subcategory', false] }, ['$subcategory'], []] }] } } },
    { $unwind: '$cats' },
    { $match: { cats: { $in: ids } } },
    { $group: { _id: '$cats', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

async function childCounts(categoryIds) {
  const rows = await Category.aggregate([
    { $match: { parent: { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
    { $group: { _id: '$parent', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

async function withCounts(categories) {
  const ids = categories.map((category) => category._id);
  const [products, children] = await Promise.all([productCounts(ids), childCounts(ids)]);
  return categories.map((category) => ({
    ...category.toJSON(),
    productCount: products.get(String(category._id)) ?? 0,
    childCount: children.get(String(category._id)) ?? 0,
  }));
}

export async function listCategories(query) {
  const filter = {};
  const regex = searchRegex(query.search);
  if (regex) filter.$or = [{ name: regex }, { code: regex }, { slug: regex }];
  if (['active', 'inactive'].includes(query.status)) filter.status = query.status;
  if (query.parent === 'root') filter.parent = null;
  else if (isObjectId(query.parent)) filter.parent = query.parent;
  const featured = toBoolean(query.featured);
  if (featured !== undefined) filter.isFeatured = featured;

  // Lightweight list for dropdowns and the sidebar.
  if (query.all === 'true') {
    const items = await Category.find(filter).sort({ displayOrder: 1, name: 1 }).select('name slug code parent status image thumbnail isFeatured').limit(2000);
    return { items: await withCounts(items) };
  }

  const listQuery = parseListQuery(query, { sortable: SORTABLE });
  const { items, pagination } = await paginate(Category, filter, listQuery, { populate: { path: 'parent', select: 'name slug' } });
  return { items: await withCounts(items), pagination };
}

export async function getCategory(id) {
  assertObjectId(id);
  const category = await Category.findById(id).populate('parent', 'name slug code');
  if (!category) throw new AppError('Category not found', 404);
  const [withCount] = await withCounts([category]);
  const children = await Category.find({ parent: id }).select('name slug code status image thumbnail').sort({ displayOrder: 1, name: 1 });
  return { ...withCount, children };
}

async function assertValidParent(parentId, selfId) {
  if (!parentId) return null;
  if (selfId && String(parentId) === String(selfId)) throw new AppError('A category cannot be its own parent', 400);
  let cursor = await Category.findById(parentId).select('parent');
  if (!cursor) throw new AppError('Parent category not found', 400);
  for (let depth = 0; cursor && depth < 50; depth += 1) {
    if (selfId && String(cursor._id) === String(selfId)) throw new AppError('A category cannot be moved under its own subcategory', 400);
    cursor = cursor.parent ? await Category.findById(cursor.parent).select('parent') : null;
  }
  return parentId;
}

async function assertUniqueCode(code, excludeId) {
  const filter = { code: code.toUpperCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Category.exists(filter)) throw new AppError(`Category code "${code.toUpperCase()}" is already used`, 409);
}

function uploadedFile(files, field) {
  return files?.[field]?.[0] ? publicPath(files[field][0], FOLDER) : null;
}

export async function createCategory(data, files, actor) {
  const code = data.code || generateCode('CAT');
  await assertUniqueCode(code);
  const category = await Category.create({
    name: data.name,
    slug: await uniqueSlug(Category, data.slug || data.name),
    code,
    shortDescription: data.shortDescription,
    description: data.description,
    parent: await assertValidParent(data.parent),
    seo: data.seo,
    displayOrder: data.displayOrder,
    isFeatured: data.isFeatured,
    status: data.status,
    image: uploadedFile(files, 'image') ?? '',
    thumbnail: uploadedFile(files, 'thumbnail') ?? '',
  });
  await notify({ type: 'category.created', title: 'Category created', message: category.name, link: `/categories/${category.id}`, actor });
  return getCategory(category.id);
}

export async function updateCategory(id, data, files) {
  assertObjectId(id);
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found', 404);
  const code = data.code || category.code;
  await assertUniqueCode(code, id);

  const replaced = [];
  for (const field of ['image', 'thumbnail']) {
    const upload = uploadedFile(files, field);
    const remove = field === 'image' ? data.removeImage : data.removeThumbnail;
    if (upload) {
      replaced.push(category[field]);
      category[field] = upload;
    } else if (remove) {
      replaced.push(category[field]);
      category[field] = '';
    }
  }

  const slugSource = data.slug || (data.name !== category.name ? data.name : category.slug);
  category.set({
    name: data.name,
    slug: slugSource === category.slug ? category.slug : await uniqueSlug(Category, slugSource, id),
    code,
    shortDescription: data.shortDescription,
    description: data.description,
    parent: await assertValidParent(data.parent, id),
    seo: data.seo,
    displayOrder: data.displayOrder,
    isFeatured: data.isFeatured,
    status: data.status,
  });
  await category.save();
  await deleteUnusedFiles(replaced);
  return getCategory(id);
}

export async function setCategoryFields(id, fields) {
  assertObjectId(id);
  const category = await Category.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  return category;
}

async function deletionBlocker(category) {
  const [products, children] = await Promise.all([
    Product.countDocuments({ $or: [{ category: category._id }, { subcategory: category._id }] }),
    Category.countDocuments({ parent: category._id }),
  ]);
  if (products) return `"${category.name}" has ${products} product(s). Move or delete them first.`;
  if (children) return `"${category.name}" has ${children} subcategor${children === 1 ? 'y' : 'ies'}. Move or delete them first.`;
  return null;
}

export async function deleteCategory(id, actor) {
  assertObjectId(id);
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found', 404);
  const blocker = await deletionBlocker(category);
  if (blocker) throw new AppError(blocker, 409);
  await category.deleteOne();
  await deleteUnusedFiles([category.image, category.thumbnail]);
  await notify({ type: 'category.deleted', title: 'Category deleted', message: category.name, actor });
}

export async function bulkDeleteCategories(ids, actor) {
  const categories = await Category.find({ _id: { $in: parseIdList(ids) } });
  const deleted = [];
  const skipped = [];
  for (const category of categories) {
    const blocker = await deletionBlocker(category);
    if (blocker) {
      skipped.push({ id: category.id, name: category.name, reason: blocker });
      continue;
    }
    await category.deleteOne();
    await deleteUnusedFiles([category.image, category.thumbnail]);
    deleted.push(category.id);
  }
  if (deleted.length) await notify({ type: 'category.deleted', title: `${deleted.length} categor${deleted.length === 1 ? 'y' : 'ies'} deleted`, actor });
  return { deleted: deleted.length, skipped };
}

export async function bulkCategoryStatus(ids, status) {
  if (!['active', 'inactive'].includes(status)) throw new AppError('Status must be active or inactive', 400);
  const result = await Category.updateMany({ _id: { $in: parseIdList(ids) } }, { status });
  return { updated: result.modifiedCount };
}
