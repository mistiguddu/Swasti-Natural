import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createCrudRouter, createCrudService } from '../utils/crudFactory.js';
import { isObjectId } from '../utils/query.js';
import { Banner, Coupon, Discount, ShippingMethod } from '../models/Marketing.js';
import * as reviews from '../services/review.service.js';
import * as notifications from '../services/notification.service.js';
import * as settings from '../services/setting.service.js';
import { imageUpload, parseMultipartJson } from '../config/upload.js';
import {
  bannerSchema, brandingSchema, bulkIdsSchema, couponSchema, createReviewSchema, discountSchema, generalSettingsSchema,
  reviewModerationSchema, shippingSchema, storeSettingsSchema,
} from '../middlewares/admin-schemas.js';

const guard = (permission) => [authenticate, requirePermission(permission)];
const mount = (permission, router) => Router().use(...guard(permission), router);

/* Marketing */
export const couponRouter = mount('marketing.manage', createCrudRouter(createCrudService({
  Model: Coupon, label: 'Coupon', searchFields: ['code', 'description'], uniqueField: 'code', notifyType: 'coupon',
  sortable: ['createdAt', 'code', 'value', 'expiresAt', 'usedCount'],
  filters: (query) => (['percentage', 'fixed'].includes(query.type) ? { type: query.type } : {}),
}), couponSchema));

export const discountRouter = mount('marketing.manage', createCrudRouter(createCrudService({
  Model: Discount, label: 'Discount', searchFields: ['name', 'description'], notifyType: 'discount',
  sortable: ['createdAt', 'name', 'value', 'endsAt'],
  populate: [{ path: 'categories', select: 'name' }, { path: 'products', select: 'name sku' }],
  filters: (query) => (['all', 'category', 'product'].includes(query.appliesTo) ? { appliesTo: query.appliesTo } : {}),
}), discountSchema));

const bannerService = (kind, label) => createCrudService({
  Model: Banner, label, baseFilter: { kind }, searchFields: ['title', 'subtitle', 'position'], imageFolder: 'banners', notifyType: kind,
  sortable: ['createdAt', 'title', 'displayOrder'],
});
export const bannerRouter = mount('marketing.manage', createCrudRouter(bannerService('banner', 'Banner'), bannerSchema, { imageFolder: 'banners' }));
export const sliderRouter = mount('marketing.manage', createCrudRouter(bannerService('slider', 'Slider'), bannerSchema, { imageFolder: 'banners' }));

/* Shipping */
export const shippingRouter = mount('shipping.manage', createCrudRouter(createCrudService({
  Model: ShippingMethod, label: 'Shipping method', searchFields: ['name', 'zone', 'description'],
  sortable: ['createdAt', 'name', 'charge', 'displayOrder'],
}), shippingSchema));

/* Reviews: customers create, staff moderate */
export const reviewRouter = Router();
reviewRouter.post('/', authenticate, validate(createReviewSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await reviews.createReview(req.validated.body, req.user) });
}));
reviewRouter.use(...guard('reviews.manage'));
reviewRouter.get('/', asyncHandler(async (req, res) => res.json({ data: await reviews.listReviews(req.query) })));
reviewRouter.post('/bulk-delete', validate(bulkIdsSchema), asyncHandler(async (req, res) => res.json({ data: await reviews.bulkDeleteReviews(req.validated.body.ids) })));
reviewRouter.patch('/bulk-status', asyncHandler(async (req, res) => res.json({ data: await reviews.bulkReviewStatus(req.body?.ids, req.body?.status) })));
reviewRouter.get('/:id', asyncHandler(async (req, res) => res.json({ data: await reviews.getReview(req.params.id) })));
reviewRouter.patch('/:id', validate(reviewModerationSchema), asyncHandler(async (req, res) => res.json({ data: await reviews.moderateReview(req.params.id, req.validated.body) })));
reviewRouter.delete('/:id', asyncHandler(async (req, res) => {
  await reviews.deleteReview(req.params.id);
  res.status(204).end();
}));

/* Notifications & activity */
export const notificationRouter = Router();
notificationRouter.use(...guard('dashboard.view'));
notificationRouter.get('/', asyncHandler(async (req, res) => res.json({ data: await notifications.listNotifications(req.query) })));
notificationRouter.get('/unread-count', asyncHandler(async (req, res) => res.json({ data: { unread: await notifications.unreadCount() } })));
notificationRouter.patch('/read-all', asyncHandler(async (req, res) => {
  const result = await notifications.markAllRead();
  res.json({ data: { updated: result.modifiedCount } });
}));
notificationRouter.post('/bulk-delete', validate(bulkIdsSchema), asyncHandler(async (req, res) => {
  const result = await notifications.deleteNotifications(req.validated.body.ids);
  res.json({ data: { deleted: result.deletedCount } });
}));
notificationRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: { message: 'Invalid id' } });
  const notification = await notifications.markRead(req.params.id);
  return notification ? res.json({ data: notification }) : res.status(404).json({ error: { message: 'Notification not found' } });
}));
notificationRouter.delete('/:id', asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: { message: 'Invalid id' } });
  await notifications.deleteNotification(req.params.id);
  return res.status(204).end();
}));

/* Settings */
export const settingRouter = Router();
// Public: project name + logos for the login page and browser tab (no auth, no private data).
settingRouter.get('/public', asyncHandler(async (req, res) => res.json({ data: await settings.getPublicBranding() })));
settingRouter.put(
  '/branding',
  ...guard('settings.manage'),
  imageUpload('branding', [{ name: 'logo', maxCount: 1 }, { name: 'logoMark', maxCount: 1 }]),
  parseMultipartJson,
  validate(brandingSchema),
  asyncHandler(async (req, res) => res.json({ data: await settings.updateBranding(req.validated.body, req.files) })),
);
settingRouter.get('/', ...guard('dashboard.view'), asyncHandler(async (req, res) => res.json({ data: await settings.getSettings() })));
settingRouter.put('/general', ...guard('settings.manage'), validate(generalSettingsSchema), asyncHandler(async (req, res) => {
  res.json({ data: await settings.updateSettings('general', req.validated.body) });
}));
settingRouter.put('/store', ...guard('settings.manage'), validate(storeSettingsSchema), asyncHandler(async (req, res) => {
  res.json({ data: await settings.updateSettings('store', req.validated.body) });
}));
