import Category from '../models/Category.js';
import Product, { computeStockStatus, PRODUCT_STATUS } from '../models/Product.js';
import { Review } from '../models/Marketing.js';
import AppError from '../utils/AppError.js';
import { generateCode, uniqueSlug } from '../utils/slugify.js';
import { assertObjectId, isObjectId, paginate, parseIdList, parseListQuery, searchRegex, toBoolean, toNumber } from '../utils/query.js';
import { publicPath } from '../config/upload.js';
import { deleteUnusedFiles } from './file.service.js';
import { notify } from './notification.service.js';

const FOLDER = 'products';
const SORTABLE = ['name', 'createdAt', 'updatedAt', 'regularPrice', 'salePrice', 'stockQuantity', 'soldCount', 'sku'];
const POPULATE = [{ path: 'category', select: 'name slug code image thumbnail' }, { path: 'subcategory', select: 'name slug code' }];
export const EFFECTIVE_PRICE = { $cond: [{ $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$regularPrice'] }] }, '$salePrice', '$regularPrice'] };
export const LOW_STOCK_EXPR = { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] };

export function buildProductFilter(query) {
  const filter = {};
  const and = [];
  const regex = searchRegex(query.search);
  if (regex) filter.$or = [{ name: regex }, { sku: regex }, { code: regex }, { brand: regex }, { tags: regex }];
  if (isObjectId(query.category)) and.push({ $or: [{ category: query.category }, { subcategory: query.category }] });
  if (isObjectId(query.subcategory)) filter.subcategory = query.subcategory;
  if (PRODUCT_STATUS.includes(query.status)) filter.status = query.status;
  if (query.productType) filter.productType = query.productType;

  for (const [param, field] of [['featured', 'isFeatured'], ['bestSelling', 'isBestSelling'], ['newArrival', 'isNewArrival']]) {
    const value = toBoolean(query[param]);
    if (value !== undefined) filter[field] = value;
  }

  switch (query.stock) {
    case 'in_stock': filter.stockStatus = 'in_stock'; break;
    case 'out_of_stock': filter.stockStatus = 'out_of_stock'; break;
    case 'backorder': filter.stockStatus = 'backorder'; break;
    case 'low': filter.manageStock = true; and.push({ $expr: LOW_STOCK_EXPR }); break;
    default: break;
  }

  const minPrice = toNumber(query.minPrice);
  const maxPrice = toNumber(query.maxPrice);
  if (minPrice !== undefined) and.push({ $expr: { $gte: [EFFECTIVE_PRICE, minPrice] } });
  if (maxPrice !== undefined) and.push({ $expr: { $lte: [EFFECTIVE_PRICE, maxPrice] } });
  if (and.length) filter.$and = and;
  return filter;
}

export async function listProducts(query) {
  if (query.all === 'true') {
    const items = await Product.find(buildProductFilter(query)).sort({ name: 1 }).limit(500)
      .select('name sku image thumbnail regularPrice salePrice stockQuantity manageStock allowBackorders stockStatus status category');
    return { items };
  }
  const listQuery = parseListQuery(query, { sortable: SORTABLE });
  return paginate(Product, buildProductFilter(query), listQuery, { populate: POPULATE });
}

export async function listCategoryProducts(categoryId, query) {
  assertObjectId(categoryId, 'category id');
  const category = await Category.findById(categoryId).select('name slug code image thumbnail parent status');
  if (!category) throw new AppError('Category not found', 404);
  const [result, subcategories] = await Promise.all([
    listProducts({ ...query, category: categoryId, all: undefined }),
    Category.find({ parent: categoryId }).select('name slug').sort({ displayOrder: 1, name: 1 }),
  ]);
  const total = await Product.countDocuments({ $or: [{ category: categoryId }, { subcategory: categoryId }] });
  return { ...result, category: { ...category.toJSON(), productCount: total, subcategories } };
}

export async function getProduct(id) {
  assertObjectId(id);
  const product = await Product.findById(id).populate(POPULATE);
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

async function assertCategories(categoryId, subcategoryId) {
  const category = await Category.findById(categoryId).select('_id');
  if (!category) throw new AppError('Selected category does not exist', 400);
  if (!subcategoryId) return;
  const subcategory = await Category.findById(subcategoryId).select('parent');
  if (!subcategory) throw new AppError('Selected subcategory does not exist', 400);
  if (String(subcategory.parent) !== String(categoryId)) throw new AppError('The subcategory must belong to the selected category', 400);
}

async function assertUniqueSku(sku, excludeId) {
  const filter = { sku: sku.toUpperCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) throw new AppError(`SKU "${sku.toUpperCase()}" is already used by another product`, 409);
}

function productFields(data) {
  const {
    removeImage, removeThumbnail, gallery, slug, sku, ...fields
  } = data;
  return fields;
}

const files = (req, field) => (req?.[field] ?? []).map((file) => publicPath(file, FOLDER));

async function checkLowStock(product, actor) {
  if (!product.manageStock) return;
  if (product.stockQuantity <= 0) {
    await notify({ type: 'stock.out', title: 'Out of stock', message: `${product.name} (${product.sku}) is out of stock`, link: `/products/${product.id}`, actor });
  } else if (product.stockQuantity <= product.lowStockThreshold) {
    await notify({ type: 'stock.low', title: 'Low stock', message: `${product.name} has ${product.stockQuantity} left`, link: `/products/${product.id}`, actor });
  }
}

export async function createProduct(data, uploads, actor) {
  await assertCategories(data.category, data.subcategory);
  const sku = data.sku || generateCode('SKU');
  await assertUniqueSku(sku);
  const product = await Product.create({
    ...productFields(data),
    slug: await uniqueSlug(Product, data.slug || data.name),
    sku,
    image: files(uploads, 'image')[0] ?? '',
    thumbnail: files(uploads, 'thumbnail')[0] ?? '',
    gallery: files(uploads, 'gallery'),
  });
  await notify({ type: 'product.created', title: 'Product created', message: product.name, link: `/products/${product.id}`, actor });
  await checkLowStock(product, actor);
  return getProduct(product.id);
}

export async function updateProduct(id, data, uploads, actor) {
  assertObjectId(id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  await assertCategories(data.category, data.subcategory);
  const sku = data.sku || product.sku;
  await assertUniqueSku(sku, id);

  const replaced = [];
  for (const field of ['image', 'thumbnail']) {
    const [upload] = files(uploads, field);
    const remove = field === 'image' ? data.removeImage : data.removeThumbnail;
    if (upload || remove) {
      replaced.push(product[field]);
      product[field] = upload ?? '';
    }
  }

  // `gallery` lists the existing images to keep; new uploads are appended.
  const kept = data.gallery.filter((path) => product.gallery.includes(path));
  replaced.push(...product.gallery.filter((path) => !kept.includes(path)));
  const gallery = [...kept, ...files(uploads, 'gallery')];
  if (gallery.length > 20) throw new AppError('A product can have at most 20 gallery images', 400);

  const previousStock = product.stockQuantity;
  const slugSource = data.slug || (data.name !== product.name ? data.name : product.slug);
  product.set({
    ...productFields(data),
    sku,
    gallery,
    slug: slugSource === product.slug ? product.slug : await uniqueSlug(Product, slugSource, id),
  });
  await product.save();
  await deleteUnusedFiles(replaced);
  if (product.stockQuantity !== previousStock) await checkLowStock(product, actor);
  return getProduct(id);
}

export async function duplicateProduct(id, actor) {
  const source = await getProduct(id);
  const copy = source.toObject({ depopulate: true, virtuals: false });
  for (const key of ['_id', 'id', 'createdAt', 'updatedAt', '__v']) delete copy[key];
  let sku = `${source.sku}-COPY`.slice(0, 60);
  if (await Product.exists({ sku })) sku = generateCode('SKU');
  const product = await Product.create({
    ...copy,
    name: `${source.name} (Copy)`.slice(0, 200),
    slug: await uniqueSlug(Product, `${source.slug}-copy`),
    sku,
    status: 'draft',
    soldCount: 0,
    ratingAverage: 0,
    ratingCount: 0,
  });
  await notify({ type: 'product.created', title: 'Product duplicated', message: `${product.name}`, link: `/products/${product.id}`, actor });
  return getProduct(product.id);
}

export async function setProductFields(id, fields) {
  assertObjectId(id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  product.set(fields);
  await product.save();
  return product;
}

export async function updateStock(id, { mode, quantity, lowStockThreshold }, actor) {
  assertObjectId(id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  product.stockQuantity = mode === 'adjust' ? product.stockQuantity + quantity : quantity;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  if (product.stockQuantity < 0 && !product.allowBackorders) throw new AppError('Stock cannot go below zero unless backorders are allowed', 400);
  await product.save();
  await checkLowStock(product, actor);
  return product;
}

/** Re-derives stockStatus after atomic $inc updates (used by orders). */
export async function refreshStockStatus(productIds, actor) {
  const products = await Product.find({ _id: { $in: productIds } });
  for (const product of products) {
    const status = computeStockStatus(product);
    if (status !== product.stockStatus) {
      product.stockStatus = status;
      await product.save();
    }
    await checkLowStock(product, actor);
  }
}

async function removeProduct(product) {
  await product.deleteOne();
  await Review.deleteMany({ product: product._id });
  await deleteUnusedFiles([product.image, product.thumbnail, ...product.gallery]);
}

export async function deleteProduct(id, actor) {
  assertObjectId(id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  await removeProduct(product);
  await notify({ type: 'product.deleted', title: 'Product deleted', message: product.name, actor });
}

export async function bulkDeleteProducts(ids, actor) {
  const products = await Product.find({ _id: { $in: parseIdList(ids) } });
  for (const product of products) await removeProduct(product);
  if (products.length) await notify({ type: 'product.deleted', title: `${products.length} product(s) deleted`, actor });
  return { deleted: products.length };
}

export async function bulkProductStatus(ids, status) {
  if (!PRODUCT_STATUS.includes(status)) throw new AppError('Invalid status', 400);
  const result = await Product.updateMany({ _id: { $in: parseIdList(ids) } }, { status });
  return { updated: result.modifiedCount };
}

export async function bulkProductCategory(ids, categoryId, subcategoryId) {
  await assertCategories(categoryId, subcategoryId);
  const result = await Product.updateMany({ _id: { $in: parseIdList(ids) } }, { category: categoryId, subcategory: subcategoryId || null });
  return { updated: result.modifiedCount };
}

export async function inventorySummary() {
  const [row] = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalUnits: { $sum: { $cond: ['$manageStock', { $max: ['$stockQuantity', 0] }, 0] } },
        stockValueCost: { $sum: { $multiply: [{ $max: ['$stockQuantity', 0] }, '$costPrice'] } },
        stockValueRetail: { $sum: { $multiply: [{ $max: ['$stockQuantity', 0] }, EFFECTIVE_PRICE] } },
        inStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'in_stock'] }, 1, 0] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'out_of_stock'] }, 1, 0] } },
        backorder: { $sum: { $cond: [{ $eq: ['$stockStatus', 'backorder'] }, 1, 0] } },
        lowStock: { $sum: { $cond: [{ $and: ['$manageStock', LOW_STOCK_EXPR] }, 1, 0] } },
      },
    },
  ]);
  const summary = row ?? { totalProducts: 0, totalUnits: 0, stockValueCost: 0, stockValueRetail: 0, inStock: 0, outOfStock: 0, backorder: 0, lowStock: 0 };
  delete summary._id;
  return summary;
}

