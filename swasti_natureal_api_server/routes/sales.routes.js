import { Router } from 'express';
import * as orders from '../controllers/order.controller.js';
import * as users from '../controllers/user.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createOrderSchema, createUserSchema, orderPaymentSchema, orderStatusSchema, updateUserSchema, userStatusSchema,
} from '../middlewares/admin-schemas.js';

/* Orders: staff manage all orders; customers may place their own (POST). */
export const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.post('/', validate(createOrderSchema), asyncHandler(orders.create));
orderRouter.use(requirePermission('orders.manage'));
orderRouter.get('/', asyncHandler(orders.list));
orderRouter.get('/:id', asyncHandler(orders.get));
orderRouter.patch('/:id/status', validate(orderStatusSchema), asyncHandler(orders.updateStatus));
orderRouter.patch('/:id/payment', validate(orderPaymentSchema), asyncHandler(orders.updatePayment));

export const customerRouter = Router();
customerRouter.use(authenticate, requirePermission('customers.manage'));
customerRouter.get('/', asyncHandler(users.listCustomers));
customerRouter.get('/:id', asyncHandler(users.getCustomer));

export const userRouter = Router();
userRouter.use(authenticate, requirePermission('users.manage'));
userRouter.get('/', asyncHandler(users.list));
userRouter.get('/roles', asyncHandler(users.roles));
userRouter.post('/', validate(createUserSchema), asyncHandler(users.create));
userRouter.get('/:id', asyncHandler(users.get));
userRouter.put('/:id', validate(updateUserSchema), asyncHandler(users.update));
userRouter.patch('/:id/status', validate(userStatusSchema), asyncHandler(users.setStatus));
userRouter.delete('/:id', asyncHandler(users.remove));

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requirePermission('dashboard.view'));
dashboardRouter.get('/overview', asyncHandler(analytics.overview));
dashboardRouter.get('/sales', asyncHandler(analytics.sales));
dashboardRouter.get('/revenue', asyncHandler(analytics.revenue));
dashboardRouter.get('/top-products', asyncHandler(analytics.topProducts));
dashboardRouter.get('/top-categories', asyncHandler(analytics.topCategories));
dashboardRouter.get('/order-stats', asyncHandler(analytics.orderStats));
dashboardRouter.get('/customer-growth', asyncHandler(analytics.customerGrowth));
dashboardRouter.get('/recent-orders', asyncHandler(analytics.recentOrders));
dashboardRouter.get('/activities', asyncHandler(analytics.activities));

export const reportRouter = Router();
reportRouter.use(authenticate, requirePermission('reports.view'));
for (const [name, handler] of Object.entries(analytics.reports)) reportRouter.get(`/${name}`, asyncHandler(handler));
