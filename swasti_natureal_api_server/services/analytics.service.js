import Order, { NON_REVENUE_STATUS, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { fillSeries, mongoDateFormat, percentChange, resolveDateRange } from '../utils/dateRange.js';
import { EFFECTIVE_PRICE, inventorySummary, LOW_STOCK_EXPR } from './product.service.js';
import { listNotifications } from './notification.service.js';

const round = (value) => Math.round((value ?? 0) * 100) / 100;
const inRange = (start, end) => ({ createdAt: { $gte: start, $lte: end } });
const revenueMatch = (start, end) => ({ ...inRange(start, end), status: { $nin: NON_REVENUE_STATUS } });
const lineRevenue = { $subtract: ['$items.total', '$items.discount'] };
const bucket = (granularity, timezone) => ({ $dateToString: { format: mongoDateFormat(granularity), date: '$createdAt', timezone } });

async function periodTotals(start, end) {
  const [revenue, orders, customers, products, categories, users] = await Promise.all([
    Order.aggregate([{ $match: revenueMatch(start, end) }, { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }]),
    Order.countDocuments(inRange(start, end)),
    User.countDocuments({ ...inRange(start, end), role: 'user' }),
    Product.countDocuments(inRange(start, end)),
    Category.countDocuments(inRange(start, end)),
    User.countDocuments(inRange(start, end)),
  ]);
  return { revenue: round(revenue[0]?.total), paidOrders: revenue[0]?.count ?? 0, orders, customers, products, categories, users };
}

function card(value, current, previous) {
  return { value, current, previous, change: percentChange(current, previous) };
}

export async function overview(query) {
  const range = resolveDateRange(query);
  const [current, previous, totals] = await Promise.all([
    periodTotals(range.start, range.end),
    periodTotals(range.prevStart, range.prevEnd),
    Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      User.countDocuments({ role: 'user' }),
      User.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Product.countDocuments({ manageStock: true, $expr: LOW_STOCK_EXPR }),
      Product.countDocuments({ stockStatus: 'out_of_stock' }),
    ]),
  ]);
  const [products, categories, customers, users, pendingOrders, lowStock, outOfStock] = totals;
  return {
    range: { key: range.range, start: range.start, end: range.end, prevStart: range.prevStart, prevEnd: range.prevEnd },
    cards: {
      revenue: card(current.revenue, current.revenue, previous.revenue),
      orders: card(current.orders, current.orders, previous.orders),
      averageOrderValue: card(
        current.paidOrders ? round(current.revenue / current.paidOrders) : 0,
        current.paidOrders ? current.revenue / current.paidOrders : 0,
        previous.paidOrders ? previous.revenue / previous.paidOrders : 0,
      ),
      products: card(products, current.products, previous.products),
      categories: card(categories, current.categories, previous.categories),
      customers: card(customers, current.customers, previous.customers),
      users: card(users, current.users, previous.users),
      pendingOrders: { value: pendingOrders },
      lowStock: { value: lowStock, outOfStock },
    },
  };
}

export async function salesSeries(query) {
  const range = resolveDateRange(query);
  const rows = await Order.aggregate([
    { $match: revenueMatch(range.start, range.end) },
    { $group: { _id: bucket(range.granularity, range.timezone), revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 }, items: { $sum: { $sum: '$items.quantity' } } } },
  ]);
  const series = fillSeries(rows, range.start, range.end, range.granularity, ['revenue', 'orders', 'items']);
  const revenue = round(series.reduce((sum, row) => sum + row.revenue, 0));
  const orders = series.reduce((sum, row) => sum + row.orders, 0);
  return { granularity: range.granularity, series, totals: { revenue, orders, items: series.reduce((sum, row) => sum + row.items, 0), averageOrderValue: orders ? round(revenue / orders) : 0 } };
}

export async function revenueOverview(query) {
  const year = Number.parseInt(query.year, 10) || new Date().getFullYear();
  if (year < 2000 || year > 2100) throw new AppError('Invalid year', 400);
  const range = resolveDateRange({});
  const monthly = await Order.aggregate([
    { $match: revenueMatch(new Date(year - 1, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999)) },
    { $group: { _id: bucket('month', range.timezone), revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
  ]);
  const byKey = new Map(monthly.map((row) => [row._id, row]));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const current = byKey.get(`${year}-${month}`);
    const previous = byKey.get(`${year - 1}-${month}`);
    return {
      month: new Date(year, index, 1).toLocaleString('en', { month: 'short' }),
      revenue: round(current?.revenue),
      orders: current?.orders ?? 0,
      previousRevenue: round(previous?.revenue),
      growth: percentChange(current?.revenue ?? 0, previous?.revenue ?? 0),
    };
  });

  const yearlyRows = await Order.aggregate([
    { $match: revenueMatch(new Date(year - 4, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999)) },
    { $group: { _id: { $dateToString: { format: '%Y', date: '$createdAt', timezone: range.timezone } }, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
  ]);
  const yearly = Array.from({ length: 5 }, (_, index) => {
    const key = String(year - 4 + index);
    const row = yearlyRows.find((item) => item._id === key);
    return { year: key, revenue: round(row?.revenue), orders: row?.orders ?? 0 };
  });
  const total = months.reduce((sum, row) => sum + row.revenue, 0);
  const previousTotal = months.reduce((sum, row) => sum + row.previousRevenue, 0);
  return { year, months, yearly, totals: { revenue: round(total), previousRevenue: round(previousTotal), growth: percentChange(total, previousTotal) } };
}

export async function topProducts(query, defaultLimit = 5) {
  const range = resolveDateRange(query);
  const limit = Math.min(100, Number.parseInt(query.limit, 10) || defaultLimit);
  const rows = await Order.aggregate([
    { $match: revenueMatch(range.start, range.end) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $last: '$items.name' },
        sku: { $last: '$items.sku' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: lineRevenue },
        cost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'product', pipeline: [{ $project: { name: 1, image: 1, thumbnail: 1, stockQuantity: 1, category: 1 } }] } },
  ]);
  return rows.map((row) => {
    const product = row.product[0];
    return {
      id: String(row._id),
      name: product?.name ?? row.name,
      sku: row.sku,
      image: product?.thumbnail || product?.image || '',
      stockQuantity: product?.stockQuantity ?? null,
      deleted: !product,
      quantity: row.quantity,
      orders: row.orders,
      revenue: round(row.revenue),
      cost: round(row.cost),
      profit: round(row.revenue - row.cost),
    };
  });
}

export async function topCategories(query, defaultLimit = 6) {
  const range = resolveDateRange(query);
  const limit = Math.min(100, Number.parseInt(query.limit, 10) || defaultLimit);
  const rows = await Order.aggregate([
    { $match: revenueMatch(range.start, range.end) },
    { $unwind: '$items' },
    { $group: { _id: '$items.category', quantity: { $sum: '$items.quantity' }, revenue: { $sum: lineRevenue }, orders: { $addToSet: '$_id' } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category', pipeline: [{ $project: { name: 1, image: 1, thumbnail: 1 } }] } },
  ]);
  return rows.map((row) => ({
    id: row._id ? String(row._id) : null,
    name: row.category[0]?.name ?? 'Uncategorised',
    image: row.category[0]?.thumbnail || row.category[0]?.image || '',
    quantity: row.quantity,
    orders: row.orders.length,
    revenue: round(row.revenue),
  }));
}

export async function orderStats(query) {
  const range = resolveDateRange(query);
  const [byStatus, byPayment, byMethod] = await Promise.all([
    Order.aggregate([{ $match: inRange(range.start, range.end) }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } }]),
    Order.aggregate([{ $match: inRange(range.start, range.end) }, { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } }]),
    Order.aggregate([{ $match: inRange(range.start, range.end) }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } }]),
  ]);
  const shape = (keys, rows) => keys.map((key) => {
    const row = rows.find((item) => item._id === key);
    return { key, count: row?.count ?? 0, amount: round(row?.amount) };
  });
  const statuses = shape(ORDER_STATUS, byStatus);
  return { total: statuses.reduce((sum, row) => sum + row.count, 0), byStatus: statuses, byPaymentStatus: shape(PAYMENT_STATUS, byPayment), byPaymentMethod: shape(PAYMENT_METHODS, byMethod) };
}

export async function customerGrowth(query) {
  const range = resolveDateRange(query, 'year');
  const granularity = range.granularity === 'hour' ? 'day' : range.granularity;
  const [rows, before] = await Promise.all([
    User.aggregate([{ $match: { ...inRange(range.start, range.end), role: 'user' } }, { $group: { _id: bucket(granularity, range.timezone), customers: { $sum: 1 } } }]),
    User.countDocuments({ role: 'user', createdAt: { $lt: range.start } }),
  ]);
  let running = before;
  const series = fillSeries(rows, range.start, range.end, granularity, ['customers']).map((row) => {
    running += row.customers;
    return { ...row, total: running };
  });
  return { granularity, series, totals: { newCustomers: running - before, totalCustomers: running } };
}

export async function recentOrders(query) {
  const limit = Math.min(50, Number.parseInt(query.limit, 10) || 8);
  return Order.find().sort({ createdAt: -1 }).limit(limit).select('orderNumber customerInfo grandTotal currency status paymentStatus paymentMethod createdAt items.quantity');
}

export async function recentActivities(query) {
  const { items } = await listNotifications({ limit: Math.min(50, Number.parseInt(query.limit, 10) || 10) });
  return items;
}

/* ── Reports ── */

export async function salesReport(query) {
  const range = resolveDateRange(query);
  const [sales, [summary]] = await Promise.all([
    salesSeries(query),
    Order.aggregate([
      { $match: revenueMatch(range.start, range.end) },
      {
        $group: {
          _id: null, orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' }, subtotal: { $sum: '$subtotal' }, discount: { $sum: '$discount' },
          shipping: { $sum: '$shippingCharge' }, tax: { $sum: '$tax' }, items: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),
  ]);
  const totals = summary ?? { orders: 0, revenue: 0, subtotal: 0, discount: 0, shipping: 0, tax: 0, items: 0 };
  delete totals._id;
  Object.keys(totals).forEach((key) => { totals[key] = round(totals[key]); });
  totals.averageOrderValue = totals.orders ? round(totals.revenue / totals.orders) : 0;
  return { granularity: sales.granularity, series: sales.series, summary: totals };
}

export async function revenueReport(query) {
  const range = resolveDateRange(query);
  const [rows, byMethod, previous] = await Promise.all([
    Order.aggregate([
      { $match: revenueMatch(range.start, range.end) },
      {
        $group: {
          _id: bucket(range.granularity, range.timezone),
          revenue: { $sum: '$grandTotal' },
          cost: { $sum: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.costPrice', '$$item.quantity'] } } } } },
          discount: { $sum: '$discount' },
        },
      },
    ]),
    Order.aggregate([{ $match: revenueMatch(range.start, range.end) }, { $group: { _id: '$paymentMethod', revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([{ $match: revenueMatch(range.prevStart, range.prevEnd) }, { $group: { _id: null, revenue: { $sum: '$grandTotal' } } }]),
  ]);
  const series = fillSeries(rows, range.start, range.end, range.granularity, ['revenue', 'cost', 'discount']).map((row) => ({ ...row, profit: round(row.revenue - row.cost) }));
  const revenue = round(series.reduce((sum, row) => sum + row.revenue, 0));
  const cost = round(series.reduce((sum, row) => sum + row.cost, 0));
  return {
    granularity: range.granularity,
    series,
    byPaymentMethod: byMethod.map((row) => ({ method: row._id, revenue: round(row.revenue), orders: row.orders })),
    summary: {
      revenue, cost, profit: round(revenue - cost), margin: revenue ? round(((revenue - cost) / revenue) * 100) : 0,
      discount: round(series.reduce((sum, row) => sum + row.discount, 0)),
      previousRevenue: round(previous[0]?.revenue), growth: percentChange(revenue, previous[0]?.revenue ?? 0),
    },
  };
}

export async function productReport(query) {
  const products = await topProducts({ ...query, limit: query.limit || 50 }, 50);
  return {
    items: products,
    summary: {
      productsSold: products.length,
      units: products.reduce((sum, row) => sum + row.quantity, 0),
      revenue: round(products.reduce((sum, row) => sum + row.revenue, 0)),
      profit: round(products.reduce((sum, row) => sum + row.profit, 0)),
    },
  };
}

export async function categoryReport(query) {
  const categories = await topCategories({ ...query, limit: query.limit || 50 }, 50);
  return { items: categories, summary: { categories: categories.length, revenue: round(categories.reduce((sum, row) => sum + row.revenue, 0)), units: categories.reduce((sum, row) => sum + row.quantity, 0) } };
}

export async function customerReport(query) {
  const range = resolveDateRange(query);
  const [growth, top, [buyers]] = await Promise.all([
    customerGrowth(query),
    Order.aggregate([
      { $match: revenueMatch(range.start, range.end) },
      { $group: { _id: '$customer', name: { $last: '$customerInfo.name' }, email: { $last: '$customerInfo.email' }, orders: { $sum: 1 }, spent: { $sum: '$grandTotal' } } },
      { $sort: { spent: -1 } },
      { $limit: 20 },
    ]),
    Order.aggregate([
      { $match: revenueMatch(range.start, range.end) },
      { $group: { _id: '$customer', orders: { $sum: 1 } } },
      { $group: { _id: null, buyers: { $sum: 1 }, returning: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } } } },
    ]),
  ]);
  return {
    granularity: growth.granularity,
    series: growth.series,
    topCustomers: top.map((row) => ({ id: String(row._id), name: row.name, email: row.email, orders: row.orders, spent: round(row.spent) })),
    summary: { ...growth.totals, buyers: buyers?.buyers ?? 0, returningBuyers: buyers?.returning ?? 0 },
  };
}

export async function orderReport(query) {
  const range = resolveDateRange(query);
  const [stats, rows] = await Promise.all([
    orderStats(query),
    Order.aggregate([
      { $match: inRange(range.start, range.end) },
      {
        $group: {
          _id: bucket(range.granularity, range.timezone),
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ['$status', NON_REVENUE_STATUS] }, 1, 0] } },
        },
      },
    ]),
  ]);
  return { granularity: range.granularity, series: fillSeries(rows, range.start, range.end, range.granularity, ['orders', 'delivered', 'cancelled']), ...stats };
}

export async function inventoryReport() {
  const [summary, lowStock, outOfStock, byCategory] = await Promise.all([
    inventorySummary(),
    Product.find({ manageStock: true, $expr: LOW_STOCK_EXPR }).sort({ stockQuantity: 1 }).limit(50).select('name sku image thumbnail stockQuantity lowStockThreshold stockStatus category').populate('category', 'name'),
    Product.find({ stockStatus: 'out_of_stock' }).sort({ updatedAt: -1 }).limit(50).select('name sku image thumbnail stockQuantity lowStockThreshold stockStatus category').populate('category', 'name'),
    Product.aggregate([
      { $group: { _id: '$category', products: { $sum: 1 }, units: { $sum: { $max: ['$stockQuantity', 0] } }, value: { $sum: { $multiply: [{ $max: ['$stockQuantity', 0] }, EFFECTIVE_PRICE] } } } },
      { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category', pipeline: [{ $project: { name: 1 } }] } },
      { $sort: { value: -1 } },
    ]),
  ]);
  Object.keys(summary).forEach((key) => { summary[key] = round(summary[key]); });
  return {
    summary,
    lowStock,
    outOfStock,
    byCategory: byCategory.map((row) => ({ id: row._id ? String(row._id) : null, name: row.category[0]?.name ?? 'Uncategorised', products: row.products, units: row.units, value: round(row.value) })),
  };
}
