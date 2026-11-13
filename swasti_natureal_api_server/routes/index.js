import { Router } from 'express';
import authRoutes from './auth.routes.js';
import { categoryRouter, productRouter } from './catalog.routes.js';
import { customerRouter, dashboardRouter, orderRouter, reportRouter, userRouter } from './sales.routes.js';
import {
  bannerRouter, couponRouter, discountRouter, notificationRouter, reviewRouter, settingRouter, shippingRouter, sliderRouter,
} from './store.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/categories', categoryRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/customers', customerRouter);
router.use('/users', userRouter);
router.use('/dashboard', dashboardRouter);
router.use('/reports', reportRouter);
router.use('/coupons', couponRouter);
router.use('/discounts', discountRouter);
router.use('/banners', bannerRouter);
router.use('/sliders', sliderRouter);
router.use('/shipping-methods', shippingRouter);
router.use('/reviews', reviewRouter);
router.use('/notifications', notificationRouter);
router.use('/settings', settingRouter);
export default router;
