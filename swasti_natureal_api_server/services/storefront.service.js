import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order, { NON_REVENUE_STATUS } from '../models/Order.js';
import { Banner, ContactMessage, Review, ShippingMethod, Subscriber } from '../models/Marketing.js';
import AppError from '../utils/AppError.js';
import { isObjectId, paginationMeta, searchRegex, toNumber } from '../utils/query.js';
import { EFFECTIVE_PRICE } from './product.service.js';
import { getSettings } from './setting.service.js';
import { notify } from './notification.service.js';

/* Public storefront data. Only active products in active categories; never cost price or other internal fields. */

const PUBLIC_FIELDS = {
  name: 1, slug: 1, sku: 1, brand: 1, productType: 1, category: 1, subcategory: 1,
  shortDescription: 1, description: 1, ingredients: 1, howToUse: 1, benefits: 1,
  regularPrice: 1, salePrice: 1, discountPercentage: 1, currency: 1, tax: 1,
  stockStatus: 1, manageStock: 1, allowBackorders: 1, stockQuantity: 1, lowStockThreshold: 1,
  image: 1, thumbnail: 1, gallery: 1, weight: 1, dimensions: 1, colors: 1, sizes: 1, material: 1, warranty: 1, tags: 1,
  isFeatured: 1, isBestSelling: 1, isNewArrival: 1, ratingAverage: 1, ratingCount: 1, seo: 1, createdAt: 1,
};
const CARD_FIELDS = 'name slug category regularPrice salePrice discountPercentage stockStatus manageStock allowBackorders stockQuantity lowStockThreshold image thumbnail ratingAverage ratingCount isFeatured isNewArrival isBestSelling createdAt';
/** Inclusion-only projection for product cards in listings. */
const LIST_PROJECTION = Object.fromEntries(`${CARD_FIELDS} brand sku shortDescription tags`.split(' ').map((field) => [field, 1]));
const round = (value) => Math.round(value * 100) / 100;
const now = () => new Date();
const isLive = (item, start = 'startsAt', end = 'endsAt') => (!item[start] || item[start] <= now()) && (!item[end] || item[end] >= now());

/** Shapes a product (document or lean object) for the storefront. */
export function toPublicProduct(product, categoriesById = new Map()) {
  const p = product.toObject ? product.toObject({ virtuals: false }) : product;
  const price = p.salePrice > 0 && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice;
  const tracked = p.manageStock && !p.allowBackorders;
  const available = tracked ? Math.max(p.stockQuantity ?? 0, 0) : null;
  const inStock = !p.manageStock ? p.stockStatus !== 'out_of_stock' : (p.stockQuantity > 0 || p.allowBackorders);
  const category = categoriesById.get(String(p.category?._id ?? p.category)) ?? (p.category?.name ? p.category : null);
  const {
    stockQuantity, lowStockThreshold, manageStock, allowBackorders, __v, _id, ...rest
  } = p;
  return {
    ...rest,
    id: String(_id),
    price,
    onSale: price < p.regularPrice,
    discountPercentage: p.discountPercentage ? Math.round(p.discountPercentage) : 0,
    inStock,
    availableQuantity: available,
    lowStock: tracked && available > 0 && available <= (lowStockThreshold ?? 5),
    category: category ? { id: String(category._id ?? category.id), name: category.name, slug: category.slug } : null,
    subcategory: undefined,
  };
}

async function activeCategories() {
  const categories = await Category.find({ status: 'active' }).select('name slug parent image thumbnail shortDescription isFeatured displayOrder').lean();
  return { categories, byId: new Map(categories.map((category) => [String(category._id), category])) };
}

function descendantsOf(categoryId, categories) {
  const ids = new Set([String(categoryId)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parent && ids.has(String(category.parent)) && !ids.has(String(category._id))) { ids.add(String(category._id)); grew = true; }
    }
  }
  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

async function findCategory(idOrSlug, categories) {
  return categories.find((category) => category.slug === idOrSlug || String(category._id) === idOrSlug) ?? null;
}

const SORTS = {
  latest: { createdAt: -1, _id: -1 },
  price_asc: { effectivePrice: 1, _id: 1 },
  price_desc: { effectivePrice: -1, _id: -1 },
  popular: { soldCount: -1, ratingCount: -1, _id: -1 },
  rating: { ratingAverage: -1, ratingCount: -1, _id: -1 },
  name: { name: 1, _id: 1 },
};

/** Product listing with filters, sort and pagination (all server-side). */
export async function listProducts(query = {}) {
  const { categories, byId } = await activeCategories();
  const activeIds = categories.map((category) => category._id);
  const match = { status: 'active', category: { $in: activeIds } };
  const and = [];

  let category = null;
  if (query.category) {
    category = await findCategory(String(query.category), categories);
    if (!category) throw new AppError('Category not found', 404);
    const ids = descendantsOf(category._id, categories);
    and.push({ $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] });
  }
  const regex = searchRegex(query.search);
  if (regex) and.push({ $or: [{ name: regex }, { brand: regex }, { tags: regex }, { shortDescription: regex }, { sku: regex }] });
  if (query.availability === 'in_stock') and.push({ $or: [{ manageStock: false, stockStatus: { $ne: 'out_of_stock' } }, { stockQuantity: { $gt: 0 } }, { allowBackorders: true }] });
  if (query.availability === 'out_of_stock') and.push({ manageStock: true, allowBackorders: false, stockQuantity: { $lte: 0 } });
  if (query.onSale === 'true') and.push({ $expr: { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$regularPrice'] }] } });
  if (query.featured === 'true') match.isFeatured = true;
  if (query.newArrival === 'true') match.isNewArrival = true;
  if (query.bestSelling === 'true') match.isBestSelling = true;
  if (query.ids) {
    const ids = String(query.ids).split(',').filter(isObjectId).slice(0, 60).map((id) => new mongoose.Types.ObjectId(id));
    match._id = { $in: ids };
  }
  if (query.exclude && isObjectId(String(query.exclude))) and.push({ _id: { $ne: new mongoose.Types.ObjectId(String(query.exclude)) } });
  if (and.length) match.$and = and;

  const minPrice = toNumber(query.minPrice);
  const maxPrice = toNumber(query.maxPrice);
  const priceMatch = {};
  if (minPrice !== undefined) priceMatch.$gte = minPrice;
  if (maxPrice !== undefined) priceMatch.$lte = maxPrice;

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  const sort = SORTS[query.sort] ?? SORTS.latest;

  const [result] = await Product.aggregate([
    { $match: match },
    { $addFields: { effectivePrice: EFFECTIVE_PRICE } },
    ...(Object.keys(priceMatch).length ? [{ $match: { effectivePrice: priceMatch } }] : []),
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: LIST_PROJECTION }],
        total: [{ $count: 'count' }],
        priceRange: [{ $group: { _id: null, min: { $min: '$effectivePrice' }, max: { $max: '$effectivePrice' } } }],
      },
    },
  ]);

  return {
    items: result.items.map((item) => toPublicProduct(item, byId)),
    pagination: paginationMeta(result.total[0]?.count ?? 0, page, limit),
    priceRange: { min: result.priceRange[0]?.min ?? 0, max: result.priceRange[0]?.max ?? 0 },
    category: category ? publicCategory(category) : null,
  };
}

function publicCategory(category, productCount) {
  return {
    id: String(category._id), name: category.name, slug: category.slug, image: category.image, thumbnail: category.thumbnail,
    shortDescription: category.shortDescription, parent: category.parent ? String(category.parent) : null, isFeatured: category.isFeatured,
    ...(productCount !== undefined ? { productCount } : {}),
  };
}

/** Active categories with active product counts (including subcategories). */
export async function listCategories() {
  const { categories } = await activeCategories();
  // Count each active product once per category tree (a product may sit in a parent and its subcategory).
  const products = await Product.find({ status: 'active' }).select('category subcategory').lean();
  const total = (category) => {
    const ids = new Set(descendantsOf(category._id, categories).map(String));
    return products.filter((product) => ids.has(String(product.category)) || (product.subcategory && ids.has(String(product.subcategory)))).length;
  };
  const sorted = [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));
  return sorted.map((category) => publicCategory(category, total(category)));
}

export async function getCategory(slug) {
  const { categories } = await activeCategories();
  const category = await findCategory(String(slug), categories);
  if (!category) throw new AppError('Category not found', 404);
  const full = await Category.findById(category._id).select('name slug image thumbnail shortDescription description parent seo').lean();
  const children = categories.filter((item) => String(item.parent) === String(category._id)).map((item) => publicCategory(item));
  return { ...publicCategory(full), description: full.description, seo: full.seo, children };
}

async function frequentlyBoughtTogether(productId, byId) {
  const rows = await Order.aggregate([
    { $match: { 'items.product': productId, status: { $nin: NON_REVENUE_STATUS } } },
    { $sort: { createdAt: -1 } },
    { $limit: 500 },
    { $unwind: '$items' },
    { $match: { 'items.product': { $ne: productId } } },
    { $group: { _id: '$items.product', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  if (!rows.length) return [];
  const products = await Product.find({ _id: { $in: rows.map((row) => row._id) }, status: 'active', category: { $in: [...byId.keys()] } }).select(CARD_FIELDS).lean();
  const order = new Map(rows.map((row, index) => [String(row._id), index]));
  return products.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id))).slice(0, 4).map((item) => toPublicProduct(item, byId));
}

/** Product details by slug (or id), with related products, frequently bought together and rating summary. */
export async function getProduct(slugOrId) {
  const { byId } = await activeCategories();
  const filter = isObjectId(String(slugOrId)) ? { _id: slugOrId } : { slug: String(slugOrId).toLowerCase() };
  const product = await Product.findOne({ ...filter, status: 'active' }).select(PUBLIC_FIELDS).lean();
  if (!product || !byId.has(String(product.category))) throw new AppError('Product not found', 404);

  const [related, together, ratings] = await Promise.all([
    Product.find({
      _id: { $ne: product._id }, status: 'active',
      $or: [{ category: product.category }, ...(product.subcategory ? [{ subcategory: product.subcategory }] : [])],
    }).sort({ isFeatured: -1, soldCount: -1, createdAt: -1 }).limit(8).select(CARD_FIELDS).lean(),
    frequentlyBoughtTogether(product._id, byId),
    Review.aggregate([{ $match: { product: product._id, status: 'approved' } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ]);
  const subcategory = product.subcategory ? byId.get(String(product.subcategory)) : null;
  return {
    ...toPublicProduct(product, byId),
    subcategory: subcategory ? { id: String(subcategory._id), name: subcategory.name, slug: subcategory.slug } : null,
    ratingBreakdown: Object.fromEntries([5, 4, 3, 2, 1].map((star) => [star, ratings.find((row) => row._id === star)?.count ?? 0])),
    related: related.map((item) => toPublicProduct(item, byId)),
    frequentlyBoughtTogether: together,
  };
}

/** Approved reviews for a product (customer first name only). */
export async function listProductReviews(productId, query = {}) {
  if (!isObjectId(String(productId))) throw new AppError('Invalid product', 400);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, Number.parseInt(query.limit, 10) || 5));
  const filter = { product: productId, status: 'approved' };
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('customer', 'name').lean(),
    Review.countDocuments(filter),
  ]);
  return {
    items: items.map((review) => ({
      id: String(review._id), rating: review.rating, title: review.title, comment: review.comment, adminReply: review.adminReply,
      author: (review.customer?.name ?? 'Customer').split(' ')[0], createdAt: review.createdAt,
    })),
    pagination: paginationMeta(total, page, limit),
  };
}

async function productSection(match, sort, limit, byId) {
  const items = await Product.find({ status: 'active', category: { $in: [...byId.keys()] }, ...match }).sort(sort).limit(limit).select(CARD_FIELDS).lean();
  return items.map((item) => toPublicProduct(item, byId));
}

/** Everything the homepage needs in one request. */
export async function home() {
  const { categories, byId } = await activeCategories();
  const [slides, banners, featured, newArrivals, bestSelling, onSale, testimonials, categoryList] = await Promise.all([
    Banner.find({ kind: 'slider', status: 'active' }).sort({ displayOrder: 1, createdAt: -1 }).lean(),
    Banner.find({ kind: 'banner', status: 'active' }).sort({ displayOrder: 1, createdAt: -1 }).lean(),
    productSection({ isFeatured: true }, { createdAt: -1 }, 8, byId),
    productSection({}, { isNewArrival: -1, createdAt: -1 }, 8, byId),
    productSection({}, { isBestSelling: -1, soldCount: -1, ratingCount: -1 }, 8, byId),
    productSection({ $expr: { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$regularPrice'] }] } }, { discountPercentage: -1 }, 8, byId),
    Review.find({ status: 'approved', rating: { $gte: 4 }, comment: { $ne: '' } }).sort({ createdAt: -1 }).limit(6).populate('customer', 'name').populate('product', 'name slug').lean(),
    listCategories(),
  ]);
  const featuredCategories = categoryList.filter((category) => !category.parent && category.isFeatured);
  const mapBanner = (item) => ({ id: String(item._id), title: item.title, subtitle: item.subtitle, image: item.image, link: item.link, buttonText: item.buttonText, position: item.position });
  return {
    slides: slides.filter((item) => isLive(item)).map(mapBanner),
    banners: banners.filter((item) => isLive(item)).map(mapBanner),
    categories: (featuredCategories.length ? featuredCategories : categoryList.filter((category) => !category.parent)).slice(0, 8),
    featured,
    newArrivals,
    bestSelling,
    onSale,
    testimonials: testimonials.filter((review) => review.product).map((review) => ({
      id: String(review._id), rating: review.rating, title: review.title, comment: review.comment,
      author: (review.customer?.name ?? 'Customer').split(' ')[0], product: { name: review.product.name, slug: review.product.slug },
    })),
    hasCategories: categories.length > 0,
  };
}

/** Public store information: name, contact, currency, delivery and payment options. */
export async function storeInfo() {
  const [settings, shippingMethods] = await Promise.all([
    getSettings(),
    ShippingMethod.find({ status: 'active' }).sort({ displayOrder: 1, charge: 1 }).lean(),
  ]);
  return {
    storeName: settings.general.storeName,
    tagline: settings.general.tagline,
    contact: { email: settings.general.email, phone: settings.general.phone, address: settings.general.address, website: settings.general.website },
    social: {
      facebook: settings.general.facebook, instagram: settings.general.instagram,
      youtube: settings.general.youtube, whatsapp: settings.general.whatsapp,
    },
    currency: settings.store.currency,
    currencySymbol: settings.store.currencySymbol,
    taxRate: settings.store.taxRate,
    paymentMethods: ['cash_on_delivery'],
    shippingMethods: shippingMethods.map((method) => ({
      id: String(method._id), name: method.name, description: method.description, zone: method.zone,
      charge: method.charge, freeShippingThreshold: method.freeShippingThreshold, estimatedDelivery: method.estimatedDelivery,
    })),
  };
}

export async function submitContact(data) {
  const message = await ContactMessage.create(data);
  await notify({
    type: 'contact.message',
    title: `Contact message from ${data.name}`,
    message: `${data.subject ? `${data.subject} — ` : ''}${data.message}`.slice(0, 480),
    link: '/notifications',
    actor: { name: data.email },
  });
  return { id: message.id };
}

export async function subscribe(email) {
  const existing = await Subscriber.findOne({ email });
  if (existing) return { subscribed: true, alreadySubscribed: true };
  await Subscriber.create({ email });
  await notify({ type: 'newsletter.subscribed', title: 'New newsletter subscriber', message: email });
  return { subscribed: true, alreadySubscribed: false };
}

export { round };
