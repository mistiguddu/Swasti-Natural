import Order, { NON_REVENUE_STATUS, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { Coupon, Discount, ShippingMethod } from '../models/Marketing.js';
import AppError from '../utils/AppError.js';
import { assertObjectId, isObjectId, paginate, parseListQuery, searchRegex } from '../utils/query.js';
import { resolveDateRange } from '../utils/dateRange.js';
import { getSettings } from './setting.service.js';
import { refreshStockStatus } from './product.service.js';
import { notify } from './notification.service.js';
import { isStaff } from '../config/roles.js';

const round = (value) => Math.round(value * 100) / 100;

/** Allowed status changes. Cancelled and returned are final. */
export const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function buildOrderFilter(query) {
  const filter = {};
  const regex = searchRegex(query.search);
  if (regex) filter.$or = [{ orderNumber: regex }, { 'customerInfo.name': regex }, { 'customerInfo.email': regex }, { 'customerInfo.phone': regex }, { transactionId: regex }];
  if (ORDER_STATUS.includes(query.status)) filter.status = query.status;
  if (PAYMENT_STATUS.includes(query.paymentStatus)) filter.paymentStatus = query.paymentStatus;
  if (PAYMENT_METHODS.includes(query.paymentMethod)) filter.paymentMethod = query.paymentMethod;
  if (isObjectId(query.customer)) filter.customer = query.customer;
  if (query.range || query.from || query.to) {
    const { start, end } = resolveDateRange(query);
    filter.createdAt = { $gte: start, $lte: end };
  }
  return filter;
}

export async function listOrders(query) {
  const listQuery = parseListQuery(query, { sortable: ['createdAt', 'grandTotal', 'orderNumber', 'status', 'paymentStatus'] });
  const filter = buildOrderFilter(query);
  const { status, ...withoutStatus } = filter;
  const [result, counts, paymentTotals] = await Promise.all([
    paginate(Order, filter, listQuery, { select: '-timeline' }),
    Order.aggregate([{ $match: withoutStatus }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: filter }, { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } }]),
  ]);
  return {
    ...result,
    counts: Object.fromEntries(ORDER_STATUS.map((key) => [key, counts.find((row) => row._id === key)?.count ?? 0])),
    paymentSummary: Object.fromEntries(PAYMENT_STATUS.map((key) => {
      const row = paymentTotals.find((item) => item._id === key);
      return [key, { count: row?.count ?? 0, amount: round(row?.amount ?? 0) }];
    })),
  };
}

export async function getOrder(id) {
  assertObjectId(id);
  const order = await Order.findById(id).populate('customer', 'name email phone isActive createdAt').populate('items.product', 'name slug image thumbnail status');
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

function isWithin(now, start, end) {
  return (!start || start <= now) && (!end || end >= now);
}

async function bestDiscounts(products) {
  const now = new Date();
  const discounts = (await Discount.find({ status: 'active' })).filter((discount) => isWithin(now, discount.startsAt, discount.endsAt));
  return (product, unitPrice) => {
    let best = 0;
    for (const discount of discounts) {
      const applies = discount.appliesTo === 'all'
        || (discount.appliesTo === 'category' && discount.categories.some((id) => String(id) === String(product.category?._id ?? product.category) || String(id) === String(product.subcategory?._id ?? product.subcategory)))
        || (discount.appliesTo === 'product' && discount.products.some((id) => String(id) === String(product._id)));
      if (!applies) continue;
      const amount = discount.type === 'percentage' ? unitPrice * (discount.value / 100) : discount.value;
      best = Math.max(best, Math.min(amount, unitPrice));
    }
    return round(best);
  };
}

/** Validates a coupon for an amount without using it. Returns { coupon, discount } or throws AppError. */
async function checkCoupon(code, amount) {
  if (!code) return { coupon: null, discount: 0 };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), status: 'active' });
  const now = new Date();
  if (!coupon || !isWithin(now, coupon.startsAt, coupon.expiresAt)) throw new AppError('Coupon is invalid or has expired', 400);
  if (coupon.minOrderAmount && amount < coupon.minOrderAmount) throw new AppError(`Coupon requires a minimum order of ${coupon.minOrderAmount}`, 400);
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new AppError('Coupon usage limit has been reached', 400);
  let discount = coupon.type === 'percentage' ? amount * (coupon.value / 100) : coupon.value;
  if (coupon.maxDiscountAmount > 0) discount = Math.min(discount, coupon.maxDiscountAmount);
  return { coupon, discount: round(Math.min(discount, amount)) };
}

async function reserveCoupon(code, amount) {
  const result = await checkCoupon(code, amount);
  if (!result.coupon) return result;
  const filter = { _id: result.coupon._id };
  if (result.coupon.usageLimit > 0) filter.usedCount = { $lt: result.coupon.usageLimit };
  const reserved = await Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } });
  if (!reserved) throw new AppError('Coupon usage limit has been reached', 400);
  return result;
}

/**
 * Prices a cart with the same rules as createOrder (sale price, automatic discounts,
 * coupon, shipping, tax) but never reserves stock or coupons. Unavailable lines are
 * reported instead of throwing, so the storefront can show them.
 */
export async function quoteCart({ items = [], couponCode = '', shippingMethod: shippingMethodId = null }) {
  const quantities = new Map();
  for (const item of items) quantities.set(String(item.product), (quantities.get(String(item.product)) ?? 0) + item.quantity);
  const [products, settings] = await Promise.all([
    Product.find({ _id: { $in: [...quantities.keys()] } }).populate('category', 'status'),
    getSettings(),
  ]);
  const discountFor = await bestDiscounts(products);
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines = [...quantities.entries()].map(([id, quantity]) => {
    const product = byId.get(id);
    if (!product || product.status !== 'active' || product.category?.status === 'inactive') {
      return { product: id, quantity, status: 'unavailable', message: 'This product is no longer available' };
    }
    const tracked = product.manageStock && !product.allowBackorders;
    const available = tracked ? Math.max(product.stockQuantity, 0) : null;
    const unitPrice = product.price;
    const unitDiscount = discountFor(product, unitPrice);
    const taxRate = product.tax || settings.store.taxRate || 0;
    const base = {
      product: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: product.thumbnail || product.image,
      regularPrice: product.regularPrice,
      price: unitPrice,
      unitDiscount,
      quantity,
      availableQuantity: available,
      total: round(unitPrice * quantity),
      discount: round(unitDiscount * quantity),
      tax: round((unitPrice - unitDiscount) * quantity * (taxRate / 100)),
    };
    if (tracked && available <= 0) return { ...base, status: 'out_of_stock', message: 'Out of stock' };
    if (tracked && available < quantity) return { ...base, status: 'insufficient_stock', message: `Only ${available} left in stock` };
    return { ...base, status: 'ok' };
  });

  const ok = lines.filter((line) => line.status === 'ok');
  const subtotal = round(ok.reduce((sum, line) => sum + line.total, 0));
  const itemDiscount = round(ok.reduce((sum, line) => sum + line.discount, 0));
  const tax = round(ok.reduce((sum, line) => sum + line.tax, 0));

  let shippingCharge = 0;
  let shipping = null;
  if (shippingMethodId) {
    shipping = await ShippingMethod.findOne({ _id: shippingMethodId, status: 'active' });
    if (shipping) {
      const free = shipping.freeShippingThreshold > 0 && subtotal - itemDiscount >= shipping.freeShippingThreshold;
      shippingCharge = free ? 0 : shipping.charge;
    }
  }

  let coupon = { code: '', valid: false, discount: 0, message: '' };
  if (couponCode) {
    try {
      const result = await checkCoupon(couponCode, subtotal - itemDiscount);
      coupon = { code: result.coupon.code, valid: true, discount: result.discount, message: '' };
    } catch (error) {
      coupon = { code: couponCode.toUpperCase(), valid: false, discount: 0, message: error.message };
    }
  }

  const discount = round(itemDiscount + coupon.discount);
  return {
    lines,
    canCheckout: ok.length > 0 && ok.length === lines.length,
    currency: settings.store.currency,
    coupon,
    shippingMethod: shipping ? { id: shipping.id, name: shipping.name, charge: shippingCharge, freeShippingThreshold: shipping.freeShippingThreshold } : null,
    totals: {
      items: ok.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      itemDiscount,
      couponDiscount: coupon.discount,
      discount,
      shipping: shippingCharge,
      tax,
      grandTotal: round(Math.max(0, subtotal - discount + shippingCharge + tax)),
    },
  };
}

/** Decrements stock atomically; rolls back on failure. */
async function reserveStock(lines) {
  const done = [];
  try {
    for (const { product, quantity } of lines) {
      const filter = { _id: product._id };
      if (product.manageStock && !product.allowBackorders) filter.stockQuantity = { $gte: quantity };
      const update = product.manageStock ? { $inc: { stockQuantity: -quantity, soldCount: quantity } } : { $inc: { soldCount: quantity } };
      const result = await Product.updateOne(filter, update);
      if (!result.modifiedCount) throw new AppError(`Not enough stock for ${product.name}`, 409);
      done.push({ product, quantity });
    }
  } catch (error) {
    await releaseStock(done);
    throw error;
  }
}

async function releaseStock(lines) {
  for (const { product, quantity } of lines) {
    const id = product._id ?? product;
    const tracked = await Product.findById(id).select('manageStock');
    if (!tracked) continue;
    const update = tracked.manageStock ? { $inc: { stockQuantity: quantity, soldCount: -quantity } } : { $inc: { soldCount: -quantity } };
    await Product.updateOne({ _id: id }, update);
  }
}

export async function createOrder(data, actor) {
  const staff = isStaff(actor);
  const customerId = staff ? data.customer : actor.id;
  if (!customerId) throw new AppError('Choose a customer for this order', 400);
  const customer = await User.findById(customerId);
  if (!customer || customer.role !== 'user') throw new AppError('Customer not found', 400);
  if (!customer.isActive) throw new AppError('This customer account is inactive', 400);
  // Only cash on delivery is offered to customers until an online payment gateway is configured.
  if (!staff && data.paymentMethod !== 'cash_on_delivery') throw new AppError('Only cash on delivery is available right now', 400);

  const quantities = new Map();
  for (const item of data.items) quantities.set(item.product, (quantities.get(item.product) ?? 0) + item.quantity);
  const products = await Product.find({ _id: { $in: [...quantities.keys()] } });
  if (products.length !== quantities.size) throw new AppError('One or more products no longer exist', 400);

  const settings = await getSettings();
  const discountFor = await bestDiscounts(products);
  const lines = products.map((product) => {
    if (product.status !== 'active') throw new AppError(`${product.name} is not available for sale`, 400);
    const quantity = quantities.get(product.id);
    if (product.manageStock && !product.allowBackorders && product.stockQuantity < quantity) {
      throw new AppError(`Only ${Math.max(product.stockQuantity, 0)} of ${product.name} in stock`, 409);
    }
    const unitPrice = product.price;
    const unitDiscount = discountFor(product, unitPrice);
    const lineNet = (unitPrice - unitDiscount) * quantity;
    const taxRate = product.tax || settings.store.taxRate || 0;
    return {
      product,
      quantity,
      item: {
        product: product._id,
        category: product.category,
        name: product.name,
        sku: product.sku,
        image: product.thumbnail || product.image,
        price: unitPrice,
        costPrice: product.costPrice,
        quantity,
        discount: round(unitDiscount * quantity),
        tax: round(lineNet * (taxRate / 100)),
        total: round(unitPrice * quantity),
      },
    };
  });

  const subtotal = round(lines.reduce((sum, line) => sum + line.item.total, 0));
  const itemDiscount = round(lines.reduce((sum, line) => sum + line.item.discount, 0));

  let shippingCharge = 0;
  let shippingMethod = null;
  if (data.shippingMethod) {
    shippingMethod = await ShippingMethod.findOne({ _id: data.shippingMethod, status: 'active' });
    if (!shippingMethod) throw new AppError('Shipping method not available', 400);
    const qualifiesForFree = shippingMethod.freeShippingThreshold > 0 && subtotal - itemDiscount >= shippingMethod.freeShippingThreshold;
    shippingCharge = qualifiesForFree ? 0 : shippingMethod.charge;
  }

  const { coupon, discount: couponDiscount } = await reserveCoupon(data.couponCode, subtotal - itemDiscount);
  const tax = round(lines.reduce((sum, line) => sum + line.item.tax, 0));
  const discount = round(itemDiscount + couponDiscount);

  try {
    await reserveStock(lines);
  } catch (error) {
    if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } });
    throw error;
  }
  try {
    const sequence = await nextSequence('order');
    const shippingAddress = { name: customer.name, phone: customer.phone, ...customer.address?.toObject?.(), ...data.shippingAddress };
    const order = await Order.create({
      orderNumber: `${settings.store.orderPrefix || 'SN'}-${String(sequence).padStart(6, '0')}`,
      customer: customer._id,
      customerInfo: { name: customer.name, email: customer.email, phone: customer.phone },
      items: lines.map((line) => line.item),
      subtotal,
      discount,
      shippingCharge,
      tax,
      grandTotal: round(Math.max(0, subtotal - discount + shippingCharge + tax)),
      currency: settings.store.currency,
      couponCode: coupon?.code ?? '',
      shippingMethod: shippingMethod?._id ?? null,
      shippingMethodName: shippingMethod?.name ?? '',
      paymentMethod: data.paymentMethod,
      paymentStatus: staff ? data.paymentStatus : 'pending',
      paidAt: staff && data.paymentStatus === 'paid' ? new Date() : null,
      shippingAddress,
      billingAddress: data.sameAsShipping ? shippingAddress : data.billingAddress,
      notes: data.notes,
      timeline: [{ status: 'pending', note: staff ? `Order created by ${actor.name}` : 'Order placed', by: actor.name }],
    });
    await notify({ type: 'order.created', title: `New order ${order.orderNumber}`, message: `${customer.name} · ${order.grandTotal} ${order.currency}`, link: `/orders/${order.id}`, actor });
    await refreshStockStatus(products.map((product) => product._id), actor);
    return getOrder(order.id);
  } catch (error) {
    await releaseStock(lines);
    if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } });
    throw error;
  }
}

export async function updateOrderStatus(id, { status, note, trackingNumber }, actor) {
  const order = await getOrder(id);
  if (order.status === status) throw new AppError(`Order is already ${status}`, 400);
  if (!STATUS_TRANSITIONS[order.status].includes(status)) {
    throw new AppError(`Cannot change an order from ${order.status} to ${status}`, 400);
  }
  order.status = status;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  order.timeline.push({ status, note, by: actor.name });

  if (NON_REVENUE_STATUS.includes(status) && !order.stockRestored) {
    await releaseStock(order.items.map((item) => ({ product: item.product?._id ?? item.product, quantity: item.quantity })));
    order.stockRestored = true;
    if (status === 'returned' && order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
  }
  if (status === 'delivered' && order.paymentMethod === 'cash_on_delivery' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
  }
  await order.save();
  if (order.stockRestored) await refreshStockStatus(order.items.map((item) => item.product?._id ?? item.product), actor);
  await notify({ type: 'order.status', title: `Order ${order.orderNumber} ${status}`, message: note, link: `/orders/${order.id}`, actor });
  return getOrder(id);
}

export async function updateOrderPayment(id, { paymentStatus, transactionId, note }, actor) {
  const order = await getOrder(id);
  order.paymentStatus = paymentStatus;
  if (transactionId !== undefined) order.transactionId = transactionId;
  order.paidAt = paymentStatus === 'paid' ? (order.paidAt ?? new Date()) : order.paidAt;
  order.timeline.push({ status: `payment_${paymentStatus}`, note, by: actor.name });
  await order.save();
  await notify({ type: 'payment.updated', title: `Payment ${paymentStatus} · ${order.orderNumber}`, link: `/orders/${order.id}`, actor });
  return getOrder(id);
}
