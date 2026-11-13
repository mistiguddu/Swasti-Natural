import { Router } from 'express';
import * as categories from '../controllers/category.controller.js';
import * as products from '../controllers/product.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { imageUpload, parseMultipartJson } from '../config/upload.js';
import {
  bulkCategorySchema, bulkIdsSchema, bulkStatusSchema, categorySchema, featuredSchema, productSchema, statusSchema, stockSchema,
} from '../middlewares/admin-schemas.js';

const categoryUpload = [imageUpload('categories', [{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), parseMultipartJson];
const productUpload = [imageUpload('products', [{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }, { name: 'gallery', maxCount: 20 }]), parseMultipartJson];

export const categoryRouter = Router();
categoryRouter.use(authenticate, requirePermission('catalog.manage'));
categoryRouter.get('/', asyncHandler(categories.list));
categoryRouter.post('/', ...categoryUpload, validate(categorySchema), asyncHandler(categories.create));
categoryRouter.post('/bulk-delete', validate(bulkIdsSchema), asyncHandler(categories.bulkDelete));
categoryRouter.patch('/bulk-status', validate(bulkStatusSchema), asyncHandler(categories.bulkStatus));
categoryRouter.get('/:categoryId/products', asyncHandler(categories.products));
categoryRouter.get('/:id', asyncHandler(categories.get));
categoryRouter.put('/:id', ...categoryUpload, validate(categorySchema), asyncHandler(categories.update));
categoryRouter.patch('/:id/status', validate(statusSchema), asyncHandler(categories.setStatus));
categoryRouter.patch('/:id/featured', validate(featuredSchema), asyncHandler(categories.setFeatured));
categoryRouter.delete('/:id', asyncHandler(categories.remove));

export const productRouter = Router();
productRouter.use(authenticate, requirePermission('catalog.manage'));
productRouter.get('/', asyncHandler(products.list));
productRouter.get('/inventory/summary', asyncHandler(products.inventory));
productRouter.post('/', ...productUpload, validate(productSchema), asyncHandler(products.create));
productRouter.post('/bulk-delete', validate(bulkIdsSchema), asyncHandler(products.bulkDelete));
productRouter.patch('/bulk-status', validate(bulkStatusSchema), asyncHandler(products.bulkStatus));
productRouter.patch('/bulk-category', validate(bulkCategorySchema), asyncHandler(products.bulkCategory));
productRouter.get('/:id', asyncHandler(products.get));
productRouter.put('/:id', ...productUpload, validate(productSchema), asyncHandler(products.update));
productRouter.post('/:id/duplicate', asyncHandler(products.duplicate));
productRouter.patch('/:id/status', validate(statusSchema), asyncHandler(products.setStatus));
productRouter.patch('/:id/featured', validate(featuredSchema), asyncHandler(products.setFeatured));
productRouter.patch('/:id/stock', validate(stockSchema), asyncHandler(products.updateStock));
productRouter.delete('/:id', asyncHandler(products.remove));
