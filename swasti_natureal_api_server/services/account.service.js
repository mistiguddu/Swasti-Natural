import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import AppError from '../utils/AppError.js';
import { assertObjectId, paginationMeta } from '../utils/query.js';
import { toPublicProduct } from './storefront.service.js';

/* Customer "My account" data. Every query is scoped to the signed-in customer. */

const ORDER_FIELDS = 'orderNumber status paymentStatus paymentMethod grandTotal subtotal discount shippingCharge tax currency couponCode items shippingAddress billingAddress shippingMethodName trackingNumber notes timeline createdAt updatedAt paidAt';

function publicOrder(order) {
  const o = order.toObject ? order.toObject() : order;
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    currency: o.currency,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingCharge: o.shippingCharge,
    tax: o.tax,
    grandTotal: o.grandTotal,
    couponCode: o.couponCode,
    shippingMethodName: o.shippingMethodName,
    trackingNumber: o.trackingNumber,
    notes: o.notes,
    shippingAddress: o.shippingAddress,
    items: (o.items ?? []).map((item) => ({
      product: String(item.product), name: item.name, sku: item.sku, image: item.image, price: item.price, quantity: item.quantity, discount: item.discount, total: item.total,
    })),
    itemCount: (o.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    timeline: (o.timeline ?? []).map((event) => ({ status: event.status, note: event.note, at: event.at })),
    paidAt: o.paidAt,
    createdAt: o.createdAt,
  };
}

export async function listMyOrders(user, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const filter = { customer: user._id };
  if (query.status) filter.status = String(query.status);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select(ORDER_FIELDS),
    Order.countDocuments(filter),
  ]);
  return { items: items.map(publicOrder), pagination: paginationMeta(total, page, limit) };
}

/** A customer's own order by order number (or id). Other customers' orders return 404. */
export async function getMyOrder(user, orderNumberOrId) {
  const value = String(orderNumberOrId).trim();
  const filter = mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value) ? { _id: value } : { orderNumber: value.toUpperCase() };
  const order = await Order.findOne({ ...filter, customer: user._id }).select(ORDER_FIELDS);
  if (!order) throw new AppError('Order not found', 404);
  return publicOrder(order);
}

export async function accountSummary(user) {
  const [counts, recent] = await Promise.all([
    Order.aggregate([{ $match: { customer: user._id } }, { $group: { _id: '$status', count: { $sum: 1 }, spent: { $sum: '$grandTotal' } } }]),
    Order.find({ customer: user._id }).sort({ createdAt: -1 }).limit(3).select(ORDER_FIELDS),
  ]);
  const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  const active = ['pending', 'confirmed', 'processing', 'shipped'].reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
  return {
    totalOrders: counts.reduce((sum, row) => sum + row.count, 0),
    activeOrders: active,
    delivered: byStatus.delivered ?? 0,
    wishlistCount: user.wishlist?.length ?? 0,
    addressCount: user.addresses?.length ?? 0,
    recentOrders: recent.map(publicOrder),
  };
}

/* ── Addresses ── */

export async function listAddresses(user) {
  return user.addresses;
}

function ensureOneDefault(user, preferredId) {
  if (!user.addresses.length) return;
  const target = preferredId ?? user.addresses.find((address) => address.isDefault)?.id ?? user.addresses[0].id;
  user.addresses.forEach((address) => { address.isDefault = address.id === target; });
}

export async function addAddress(user, data) {
  if (user.addresses.length >= 10) throw new AppError('You can save up to 10 addresses', 400);
  user.addresses.push(data);
  const added = user.addresses[user.addresses.length - 1];
  ensureOneDefault(user, data.isDefault || user.addresses.length === 1 ? added.id : undefined);
  await user.save();
  return user.addresses;
}

export async function updateAddress(user, id, data) {
  assertObjectId(id);
  const address = user.addresses.id(id);
  if (!address) throw new AppError('Address not found', 404);
  address.set(data);
  ensureOneDefault(user, data.isDefault ? address.id : undefined);
  await user.save();
  return user.addresses;
}

export async function deleteAddress(user, id) {
  assertObjectId(id);
  const address = user.addresses.id(id);
  if (!address) throw new AppError('Address not found', 404);
  address.deleteOne();
  ensureOneDefault(user);
  await user.save();
  return user.addresses;
}

/* ── Wishlist ── */

async function wishlistProducts(ids) {
  if (!ids.length) return [];
  const categories = await Category.find({ status: 'active' }).select('name slug').lean();
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const products = await Product.find({ _id: { $in: ids }, status: 'active', category: { $in: [...byId.keys()] } })
    .select('name slug category regularPrice salePrice discountPercentage stockStatus manageStock allowBackorders stockQuantity lowStockThreshold image thumbnail ratingAverage ratingCount createdAt')
    .lean();
  const order = new Map(ids.map((id, index) => [String(id), index]));
  return products.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id))).map((product) => toPublicProduct(product, byId));
}

export async function getWishlist(user) {
  return { ids: user.wishlist.map(String), items: await wishlistProducts(user.wishlist) };
}

/** Adds products (used for single adds and for merging a guest wishlist after sign-in). */
export async function addToWishlist(user, productIds) {
  const valid = await Product.find({ _id: { $in: productIds }, status: 'active' }).select('_id').lean();
  const existing = new Set(user.wishlist.map(String));
  for (const { _id } of valid) if (!existing.has(String(_id))) user.wishlist.push(_id);
  if (user.wishlist.length > 200) user.wishlist = user.wishlist.slice(-200);
  await user.save();
  return getWishlist(user);
}

export async function removeFromWishlist(user, productId) {
  assertObjectId(productId);
  user.wishlist = user.wishlist.filter((id) => String(id) !== String(productId));
  await user.save();
  return getWishlist(user);
}

export async function reloadUser(user) {
  return User.findById(user._id);
}
