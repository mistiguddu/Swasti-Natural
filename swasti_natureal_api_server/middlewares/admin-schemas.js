import { z } from 'zod';
import { PAYMENT_METHODS, PAYMENT_STATUS, ORDER_STATUS } from '../models/Order.js';
import { PRODUCT_STATUS, PRODUCT_TYPES, STOCK_STATUS } from '../models/Product.js';
import { ROLES } from '../models/User.js';

/* ── Field helpers (accept JSON values or form strings) ── */
const text = (max) => z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().max(max));
const requiredText = (min, max) => z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().min(min).max(max));
const number = ({ min = 0, max = 1e12, int = false, fallback = 0 } = {}) => z.preprocess(
  (value) => (value === '' || value == null ? fallback : Number(value)),
  int ? z.number().int().min(min).max(max) : z.number().min(min).max(max),
);
const bool = z.preprocess((value) => value === true || value === 'true' || value === 1 || value === '1' || value === 'on', z.boolean());
/** Like `bool`, but a missing value falls back to `fallback` (keeps model defaults for API clients). */
const boolDefault = (fallback) => z.preprocess((value) => (value === undefined ? fallback : value), bool);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalId = z.preprocess((value) => (value === '' || value == null ? null : value), objectId.nullable());
const list = (max = 60) => z.preprocess(
  (value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []),
  z.array(z.string().trim().max(max)).max(100),
).transform((items) => [...new Set(items.filter(Boolean))]);
const optionalDate = z.preprocess((value) => (value === '' || value == null ? null : new Date(value)), z.date().nullable());
const status = z.enum(['active', 'inactive']).default('active');
const body = (shape) => z.object({ body: z.object(shape) });

const seo = z.object({ title: text(160), description: text(320), keywords: list(60) }).default({ title: '', description: '', keywords: [] });

const address = z.object({
  name: text(100).optional(), phone: text(30).optional(),
  line1: text(200), line2: text(200), city: text(100), state: text(100), postalCode: text(20), country: text(100),
}).partial().default({});

/* ── Catalog ── */
export const categorySchema = body({
  name: requiredText(2, 120),
  slug: text(120),
  code: text(40),
  shortDescription: text(300),
  description: text(10000),
  parent: optionalId,
  seo,
  displayOrder: number({ min: -100000, max: 100000, int: true }),
  isFeatured: bool,
  status,
  removeImage: bool,
  removeThumbnail: bool,
});

export const productSchema = body({
  name: requiredText(2, 200),
  slug: text(120),
  sku: text(60),
  code: text(60),
  brand: text(100),
  productType: z.enum(PRODUCT_TYPES).default('simple'),
  category: objectId,
  subcategory: optionalId,
  shortDescription: text(500),
  description: text(20000),
  regularPrice: number({ min: 0 }),
  salePrice: number({ min: 0 }),
  costPrice: number({ min: 0 }),
  tax: number({ min: 0, max: 100 }),
  currency: text(3).transform((value) => value.toUpperCase() || 'BDT'),
  stockQuantity: number({ min: -1e6, max: 1e9, int: true }),
  lowStockThreshold: number({ min: 0, max: 1e9, int: true, fallback: 5 }),
  stockStatus: z.enum(STOCK_STATUS).default('in_stock'),
  manageStock: boolDefault(true),
  allowBackorders: bool,
  weight: number({ min: 0 }),
  dimensions: z.object({ length: number(), width: number(), height: number() }).default({ length: 0, width: 0, height: 0 }),
  colors: list(40),
  sizes: list(40),
  material: text(100),
  warranty: text(200),
  tags: list(40),
  isFeatured: bool,
  isBestSelling: bool,
  isNewArrival: bool,
  status: z.enum(PRODUCT_STATUS).default('active'),
  seo,
  gallery: z.array(z.string().max(300)).max(20).default([]),
  removeImage: bool,
  removeThumbnail: bool,
}).superRefine(({ body: product }, context) => {
  if (product.salePrice > 0 && product.salePrice >= product.regularPrice) {
    context.addIssue({ code: 'custom', path: ['body', 'salePrice'], message: 'Sale price must be lower than the regular price' });
  }
});

export const statusSchema = body({ status: z.enum(['active', 'inactive', 'draft']) });
export const featuredSchema = body({ isFeatured: bool });
export const bulkIdsSchema = body({ ids: z.array(objectId).min(1).max(500) });
export const bulkStatusSchema = body({ ids: z.array(objectId).min(1).max(500), status: z.enum(['active', 'inactive', 'draft']) });
export const bulkCategorySchema = body({ ids: z.array(objectId).min(1).max(500), category: objectId, subcategory: optionalId });
export const stockSchema = body({
  mode: z.enum(['set', 'adjust']).default('set'),
  quantity: number({ min: -1e9, max: 1e9, int: true }),
  lowStockThreshold: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(0).optional()),
});

/* ── Orders ── */
export const createOrderSchema = body({
  customer: optionalId,
  items: z.array(z.object({ product: objectId, quantity: number({ min: 1, max: 10000, int: true, fallback: 1 }) })).min(1).max(100),
  shippingAddress: address,
  billingAddress: address,
  sameAsShipping: boolDefault(true),
  shippingMethod: optionalId,
  paymentMethod: z.enum(PAYMENT_METHODS).default('cash_on_delivery'),
  paymentStatus: z.enum(PAYMENT_STATUS).default('pending'),
  couponCode: text(40),
  notes: text(1000),
});
export const orderStatusSchema = body({ status: z.enum(ORDER_STATUS), note: text(500), trackingNumber: text(100).optional() });
export const orderPaymentSchema = body({ paymentStatus: z.enum(PAYMENT_STATUS), transactionId: text(100).optional(), note: text(500) });

/* ── Users & profile ── */
const userFields = {
  name: requiredText(2, 80),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(ROLES).default('user'),
  phone: text(30),
  isActive: boolDefault(true),
  address: address.optional(),
};
export const createUserSchema = body({ ...userFields, password: z.string().min(8).max(128) });
export const updateUserSchema = body({ ...userFields, password: z.preprocess((value) => (value === '' ? undefined : value), z.string().min(8).max(128).optional()) });
export const userStatusSchema = body({ isActive: bool });
export const profileSchema = body({ name: requiredText(2, 80), phone: text(30), address: address.optional() });
export const passwordSchema = body({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) });

/* ── Marketing, shipping, reviews, settings ── */
export const couponSchema = body({
  code: requiredText(3, 40).transform((value) => value.toUpperCase().replace(/\s+/g, '')),
  description: text(300),
  type: z.enum(['percentage', 'fixed']).default('percentage'),
  value: number({ min: 0, max: 1e9 }),
  minOrderAmount: number(),
  maxDiscountAmount: number(),
  usageLimit: number({ int: true }),
  startsAt: optionalDate,
  expiresAt: optionalDate,
  status,
}).superRefine(({ body: coupon }, context) => {
  if (coupon.type === 'percentage' && coupon.value > 100) context.addIssue({ code: 'custom', path: ['body', 'value'], message: 'A percentage cannot exceed 100' });
  if (coupon.startsAt && coupon.expiresAt && coupon.expiresAt < coupon.startsAt) context.addIssue({ code: 'custom', path: ['body', 'expiresAt'], message: 'Expiry must be after the start date' });
});

export const discountSchema = body({
  name: requiredText(2, 120),
  description: text(300),
  type: z.enum(['percentage', 'fixed']).default('percentage'),
  value: number({ min: 0, max: 1e9 }),
  appliesTo: z.enum(['all', 'category', 'product']).default('all'),
  categories: z.array(objectId).max(200).default([]),
  products: z.array(objectId).max(500).default([]),
  startsAt: optionalDate,
  endsAt: optionalDate,
  status,
}).superRefine(({ body: discount }, context) => {
  if (discount.type === 'percentage' && discount.value > 100) context.addIssue({ code: 'custom', path: ['body', 'value'], message: 'A percentage cannot exceed 100' });
  if (discount.appliesTo === 'category' && !discount.categories.length) context.addIssue({ code: 'custom', path: ['body', 'categories'], message: 'Choose at least one category' });
  if (discount.appliesTo === 'product' && !discount.products.length) context.addIssue({ code: 'custom', path: ['body', 'products'], message: 'Choose at least one product' });
});

export const bannerSchema = body({
  title: requiredText(2, 150),
  subtitle: text(300),
  link: text(500),
  buttonText: text(40),
  position: text(60).transform((value) => value || 'home'),
  displayOrder: number({ min: -100000, max: 100000, int: true }),
  startsAt: optionalDate,
  endsAt: optionalDate,
  status,
  removeImage: bool,
});

export const shippingSchema = body({
  name: requiredText(2, 120),
  description: text(300),
  zone: text(120),
  charge: number(),
  freeShippingThreshold: number(),
  estimatedDelivery: text(60),
  displayOrder: number({ min: -100000, max: 100000, int: true }),
  status,
});

export const reviewModerationSchema = body({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  adminReply: text(2000).optional(),
});
export const createReviewSchema = body({ product: objectId, rating: number({ min: 1, max: 5, int: true }), title: text(150), comment: text(3000) });

export const generalSettingsSchema = body({
  storeName: requiredText(2, 120), tagline: text(200), email: text(254), phone: text(30), address: text(300), website: text(200),
});
export const storeSettingsSchema = body({
  currency: requiredText(3, 3).transform((value) => value.toUpperCase()),
  currencySymbol: text(5),
  taxRate: number({ max: 100 }),
  defaultLowStockThreshold: number({ int: true, max: 1e6 }),
  orderPrefix: requiredText(1, 6).transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  allowGuestReviews: bool,
  autoApproveReviews: bool,
});
