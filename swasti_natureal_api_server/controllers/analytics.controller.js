import * as analytics from '../services/analytics.service.js';

const handler = (fn) => async (req, res) => res.json({ data: await fn(req.query) });

export const overview = handler(analytics.overview);
export const sales = handler(analytics.salesSeries);
export const revenue = handler(analytics.revenueOverview);
export const topProducts = handler((query) => analytics.topProducts(query));
export const topCategories = handler((query) => analytics.topCategories(query));
export const orderStats = handler(analytics.orderStats);
export const customerGrowth = handler(analytics.customerGrowth);
export const recentOrders = handler(analytics.recentOrders);
export const activities = handler(analytics.recentActivities);

export const reports = {
  sales: handler(analytics.salesReport),
  revenue: handler(analytics.revenueReport),
  products: handler(analytics.productReport),
  categories: handler(analytics.categoryReport),
  customers: handler(analytics.customerReport),
  orders: handler(analytics.orderReport),
  inventory: handler(analytics.inventoryReport),
};
