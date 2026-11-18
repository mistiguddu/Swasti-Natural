import mongoose from 'mongoose';
import { Review } from '../models/Marketing.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { publicPath } from '../config/upload.js';
import { assertObjectId, isObjectId, paginate, paginationMeta, parseIdList, parseListQuery, searchRegex } from '../utils/query.js';
import { getSettings } from './setting.service.js';
import { notify } from './notification.service.js';
import { deleteUnusedFiles } from './file.service.js';

const POPULATE = [{ path: 'product', select: 'name sku image thumbnail slug' }, { path: 'customer', select: 'name email' }];
const MAX_PHOTOS = 4;
const STATUSES = ['pending', 'approved', 'rejected'];
const REPORT_REASONS = { spam: 'Spam or advertising', offensive: 'Offensive or abusive', irrelevant: 'Not about this product', fake: 'Looks fake', other: 'Other' };

/** Keeps Product.ratingAverage/ratingCount in sync with approved reviews. */
async function refreshRating(productId) {
  const [row] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'approved' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { ratingAverage: Math.round((row?.average ?? 0) * 10) / 10, ratingCount: row?.count ?? 0 });
}

/** Has this customer received (delivered) an order containing the product? */
function hasBought(customerId, productId) {
  return Order.exists({ customer: customerId, status: 'delivered', 'items.product': productId }).then(Boolean);
}

const uploadedPhotos = (files) => (files?.images ?? []).map((file) => publicPath(file, 'reviews'));

/* ───────────────────────────── Storefront (public) ───────────────────────────── */

const SORTS = {
  helpful: { helpfulCount: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

/** First name + last initial, e.g. "Rahim K." */
function displayName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1).charAt(0).toUpperCase()}.` : parts[0];
}

function toPublicReview(review, viewerId) {
  const customerId = String(review.customer?._id ?? review.customer ?? '');
  return {
    id: String(review._id),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    images: review.images ?? [],
    verifiedPurchase: Boolean(review.verifiedPurchase),
    helpfulCount: review.helpfulCount ?? 0,
    helpful: Boolean(viewerId && (review.helpfulVoters ?? []).some((id) => String(id) === String(viewerId))),
    mine: Boolean(viewerId && customerId === String(viewerId)),
    author: displayName(review.customer?.name),
    adminReply: review.adminReply,
    adminReplyAt: review.adminReplyAt,
    createdAt: review.createdAt,
    editedAt: review.editedAt,
  };
}

/** Rating summary for a product: average, count, 5→1 distribution, how many have photos. */
async function reviewSummary(productId) {
  const id = new mongoose.Types.ObjectId(String(productId));
  const [rows, photos] = await Promise.all([
    Review.aggregate([{ $match: { product: id, status: 'approved' } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    Review.countDocuments({ product: id, status: 'approved', 'images.0': { $exists: true } }),
  ]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  let sum = 0;
  for (const row of rows) { distribution[row._id] = row.count; total += row.count; sum += row._id * row.count; }
  return { average: total ? Math.round((sum / total) * 10) / 10 : 0, count: total, distribution, withPhotos: photos };
}

/** Approved reviews of a product, with filters, sorting and the rating summary. */
export async function listProductReviews(productId, query = {}, viewer = null) {
  if (!isObjectId(String(productId))) throw new AppError('Invalid product', 400);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, Number.parseInt(query.limit, 10) || 6));
  const filter = { product: productId, status: 'approved' };
  const rating = Number.parseInt(query.rating, 10);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  if (query.withPhotos === 'true') filter['images.0'] = { $exists: true };
  if (query.verified === 'true') filter.verifiedPurchase = true;
  const sort = SORTS[query.sort] ?? SORTS.helpful;

  const [items, total, summary] = await Promise.all([
    Review.find(filter).select('+helpfulVoters').sort(sort).skip((page - 1) * limit).limit(limit).populate('customer', 'name').lean(),
    Review.countDocuments(filter),
    reviewSummary(productId),
  ]);
  return {
    items: items.map((review) => toPublicReview(review, viewer?._id)),
    pagination: paginationMeta(total, page, limit),
    summary,
  };
}

/* ───────────────────────────── Customer actions ───────────────────────────── */

/** The signed-in customer's own review of a product (any status) and whether they can write one. */
export async function myReview(productId, actor) {
  assertObjectId(productId);
  const [review, verifiedPurchase] = await Promise.all([
    Review.findOne({ product: productId, customer: actor._id }).populate('customer', 'name').lean(),
    hasBought(actor._id, productId),
  ]);
  return {
    review: review ? { ...toPublicReview(review, actor._id), status: review.status } : null,
    verifiedPurchase,
    canReview: !review,
  };
}

export async function createReview(data, actor, files) {
  const product = await Product.findOne({ _id: data.product, status: 'active' });
  if (!product) throw new AppError('Product not found', 404);
  if (await Review.exists({ product: data.product, customer: actor._id })) throw new AppError('You have already reviewed this product. You can edit your review instead.', 409);
  const images = uploadedPhotos(files);
  if (images.length > MAX_PHOTOS) throw new AppError(`You can add up to ${MAX_PHOTOS} photos`, 400);
  const settings = await getSettings();
  const review = await Review.create({
    product: data.product,
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    images,
    customer: actor._id,
    verifiedPurchase: await hasBought(actor._id, data.product),
    status: settings.store.autoApproveReviews ? 'approved' : 'pending',
  });
  await refreshRating(product._id);
  await notify({ type: 'review.created', title: 'New product review', message: `${product.name} · ${data.rating}★`, link: '/reviews', actor });
  return { ...toPublicReview(await Review.findById(review._id).populate('customer', 'name').lean(), actor._id), status: review.status };
}

async function ownReview(id, actor) {
  assertObjectId(id);
  const review = await Review.findOne({ _id: id, customer: actor._id });
  if (!review) throw new AppError('Review not found', 404);
  return review;
}

/** Customer edits their review. It goes back to moderation unless reviews are auto-approved. */
export async function updateOwnReview(id, data, actor, files) {
  const review = await ownReview(id, actor);
  const keep = (review.images ?? []).filter((url) => data.keepImages.includes(url));
  const images = [...keep, ...uploadedPhotos(files)];
  if (images.length > MAX_PHOTOS) throw new AppError(`You can add up to ${MAX_PHOTOS} photos`, 400);
  const removed = (review.images ?? []).filter((url) => !images.includes(url));
  const settings = await getSettings();
  review.set({
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    images,
    editedAt: new Date(),
    verifiedPurchase: review.verifiedPurchase || await hasBought(actor._id, review.product),
    status: settings.store.autoApproveReviews ? 'approved' : 'pending',
  });
  await review.save();
  await deleteUnusedFiles(removed);
  await refreshRating(review.product);
  return { ...toPublicReview(await Review.findById(review._id).populate('customer', 'name').lean(), actor._id), status: review.status };
}

export async function deleteOwnReview(id, actor) {
  const review = await ownReview(id, actor);
  await review.deleteOne();
  await deleteUnusedFiles(review.images ?? []);
  await refreshRating(review.product);
}

/** Toggle "helpful" on someone else's approved review. */
export async function toggleHelpful(id, actor) {
  assertObjectId(id);
  const review = await Review.findOne({ _id: id, status: 'approved' }).select('+helpfulVoters');
  if (!review) throw new AppError('Review not found', 404);
  if (String(review.customer) === String(actor._id)) throw new AppError('You can’t vote on your own review', 400);
  const voted = review.helpfulVoters.some((voter) => String(voter) === String(actor._id));
  if (voted) review.helpfulVoters.pull(actor._id);
  else review.helpfulVoters.push(actor._id);
  review.helpfulCount = review.helpfulVoters.length;
  await review.save();
  return { helpful: !voted, helpfulCount: review.helpfulCount };
}

/** Report a review to the store team (once per customer). */
export async function reportReview(id, { reason, details }, actor) {
  assertObjectId(id);
  const review = await Review.findOne({ _id: id, status: 'approved' }).select('+reports').populate('product', 'name');
  if (!review) throw new AppError('Review not found', 404);
  if (String(review.customer) === String(actor._id)) throw new AppError('You can’t report your own review', 400);
  if (review.reports.some((report) => String(report.user) === String(actor._id))) return { reported: true };
  review.reports.push({ user: actor._id, reason: details ? `${REPORT_REASONS[reason]}: ${details}` : REPORT_REASONS[reason] });
  review.reportCount = review.reports.length;
  await review.save();
  await notify({ type: 'review.reported', title: 'Review reported', message: `${review.product?.name ?? 'Product'} · ${REPORT_REASONS[reason]}`, link: '/reviews?reported=true', actor });
  return { reported: true };
}

/* ───────────────────────────── Admin ───────────────────────────── */

export async function listReviews(query) {
  const filter = {};
  if (STATUSES.includes(query.status)) filter.status = query.status;
  const rating = Number.parseInt(query.rating, 10);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  if (isObjectId(query.product)) filter.product = query.product;
  if (query.reported === 'true') filter.reportCount = { $gt: 0 };
  if (query.withPhotos === 'true') filter['images.0'] = { $exists: true };
  const regex = searchRegex(query.search);
  if (regex) {
    const [products, customers] = await Promise.all([
      Product.find({ name: regex }).select('_id').limit(200),
      User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').limit(200),
    ]);
    filter.$or = [{ title: regex }, { comment: regex }, { product: { $in: products.map((p) => p._id) } }, { customer: { $in: customers.map((c) => c._id) } }];
  }
  const listQuery = parseListQuery(query, { sortable: ['createdAt', 'rating', 'helpfulCount', 'reportCount'] });
  const [result, counts, reported] = await Promise.all([
    paginate(Review, filter, listQuery, { populate: POPULATE, select: '+reports' }),
    Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Review.countDocuments({ reportCount: { $gt: 0 } }),
  ]);
  return { ...result, counts: { ...Object.fromEntries(counts.map((row) => [row._id, row.count])), reported } };
}

export async function getReview(id) {
  assertObjectId(id);
  const review = await Review.findById(id).select('+reports').populate(POPULATE);
  if (!review) throw new AppError('Review not found', 404);
  return review;
}

export async function moderateReview(id, data) {
  const review = await getReview(id);
  const { clearReports, ...changes } = data;
  const fields = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
  if (fields.adminReply !== undefined && fields.adminReply !== review.adminReply) fields.adminReplyAt = fields.adminReply ? new Date() : null;
  review.set(fields);
  if (clearReports) { review.reports = []; review.reportCount = 0; }
  await review.save();
  await refreshRating(review.product._id);
  return getReview(id);
}

export async function deleteReview(id) {
  const review = await getReview(id);
  await review.deleteOne();
  await deleteUnusedFiles(review.images ?? []);
  await refreshRating(review.product._id);
}

export async function bulkReviewStatus(ids, status) {
  if (!STATUSES.includes(status)) throw new AppError('Invalid status', 400);
  const reviews = await Review.find({ _id: { $in: parseIdList(ids) } }).select('product');
  await Review.updateMany({ _id: { $in: ids } }, { status });
  await Promise.all([...new Set(reviews.map((review) => String(review.product)))].map(refreshRating));
  return { updated: reviews.length };
}

export async function bulkDeleteReviews(ids) {
  const reviews = await Review.find({ _id: { $in: parseIdList(ids) } }).select('product images');
  await Review.deleteMany({ _id: { $in: ids } });
  await deleteUnusedFiles(reviews.flatMap((review) => review.images ?? []));
  await Promise.all([...new Set(reviews.map((review) => String(review.product)))].map(refreshRating));
  return { deleted: reviews.length };
}
