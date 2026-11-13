import mongoose from 'mongoose';
import { Review } from '../models/Marketing.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { assertObjectId, isObjectId, paginate, parseIdList, parseListQuery, searchRegex } from '../utils/query.js';
import { getSettings } from './setting.service.js';
import { notify } from './notification.service.js';

const POPULATE = [{ path: 'product', select: 'name sku image thumbnail' }, { path: 'customer', select: 'name email' }];

/** Keeps Product.ratingAverage/ratingCount in sync with approved reviews. */
async function refreshRating(productId) {
  const [row] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'approved' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { ratingAverage: Math.round((row?.average ?? 0) * 10) / 10, ratingCount: row?.count ?? 0 });
}

export async function listReviews(query) {
  const filter = {};
  if (['pending', 'approved', 'rejected'].includes(query.status)) filter.status = query.status;
  const rating = Number.parseInt(query.rating, 10);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  if (isObjectId(query.product)) filter.product = query.product;
  const regex = searchRegex(query.search);
  if (regex) {
    const [products, customers] = await Promise.all([
      Product.find({ name: regex }).select('_id').limit(200),
      User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').limit(200),
    ]);
    filter.$or = [{ title: regex }, { comment: regex }, { product: { $in: products.map((p) => p._id) } }, { customer: { $in: customers.map((c) => c._id) } }];
  }
  const listQuery = parseListQuery(query, { sortable: ['createdAt', 'rating'] });
  const [result, counts] = await Promise.all([
    paginate(Review, filter, listQuery, { populate: POPULATE }),
    Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return { ...result, counts: Object.fromEntries(counts.map((row) => [row._id, row.count])) };
}

export async function getReview(id) {
  assertObjectId(id);
  const review = await Review.findById(id).populate(POPULATE);
  if (!review) throw new AppError('Review not found', 404);
  return review;
}

export async function createReview(data, actor) {
  const product = await Product.findOne({ _id: data.product, status: 'active' });
  if (!product) throw new AppError('Product not found', 404);
  if (await Review.exists({ product: data.product, customer: actor._id })) throw new AppError('You have already reviewed this product', 409);
  const settings = await getSettings();
  const review = await Review.create({ ...data, customer: actor._id, status: settings.store.autoApproveReviews ? 'approved' : 'pending' });
  await refreshRating(product._id);
  await notify({ type: 'review.created', title: 'New product review', message: `${product.name} · ${data.rating}★`, link: '/reviews', actor });
  return getReview(review.id);
}

export async function moderateReview(id, data) {
  const review = await getReview(id);
  review.set(Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
  await review.save();
  await refreshRating(review.product._id);
  return getReview(id);
}

export async function deleteReview(id) {
  const review = await getReview(id);
  await review.deleteOne();
  await refreshRating(review.product._id);
}

export async function bulkReviewStatus(ids, status) {
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);
  const reviews = await Review.find({ _id: { $in: parseIdList(ids) } }).select('product');
  await Review.updateMany({ _id: { $in: ids } }, { status });
  await Promise.all([...new Set(reviews.map((review) => String(review.product)))].map(refreshRating));
  return { updated: reviews.length };
}

export async function bulkDeleteReviews(ids) {
  const reviews = await Review.find({ _id: { $in: parseIdList(ids) } }).select('product');
  await Review.deleteMany({ _id: { $in: ids } });
  await Promise.all([...new Set(reviews.map((review) => String(review.product)))].map(refreshRating));
  return { deleted: reviews.length };
}
