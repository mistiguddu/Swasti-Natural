import mongoose from 'mongoose';
import { jsonOptions, STATUS } from './shared.js';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, min: 0, required: true },
  minOrderAmount: { type: Number, min: 0, default: 0 },
  maxDiscountAmount: { type: Number, min: 0, default: 0 },
  usageLimit: { type: Number, min: 0, default: 0 },
  usedCount: { type: Number, min: 0, default: 0 },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  status: { type: String, enum: STATUS, default: 'active', index: true },
}, { timestamps: true, toJSON: jsonOptions });

const discountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, min: 0, required: true },
  appliesTo: { type: String, enum: ['all', 'category', 'product'], default: 'all' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  status: { type: String, enum: STATUS, default: 'active', index: true },
}, { timestamps: true, toJSON: jsonOptions });

const bannerSchema = new mongoose.Schema({
  kind: { type: String, enum: ['banner', 'slider'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  subtitle: { type: String, trim: true, maxlength: 300, default: '' },
  image: { type: String, default: '' },
  link: { type: String, trim: true, maxlength: 500, default: '' },
  buttonText: { type: String, trim: true, maxlength: 40, default: '' },
  position: { type: String, trim: true, maxlength: 60, default: 'home' },
  displayOrder: { type: Number, default: 0 },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  status: { type: String, enum: STATUS, default: 'active', index: true },
}, { timestamps: true, toJSON: jsonOptions });

const shippingMethodSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  zone: { type: String, trim: true, maxlength: 120, default: '' },
  charge: { type: Number, min: 0, default: 0 },
  freeShippingThreshold: { type: Number, min: 0, default: 0 },
  estimatedDelivery: { type: String, trim: true, maxlength: 60, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: String, enum: STATUS, default: 'active', index: true },
}, { timestamps: true, toJSON: jsonOptions });

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, trim: true, maxlength: 150, default: '' },
  comment: { type: String, trim: true, maxlength: 3000, default: '' },
  adminReply: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true, toJSON: jsonOptions });
reviewSchema.index({ product: 1, customer: 1 }, { unique: true });

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, maxlength: 500, default: '' },
  link: { type: String, default: '' },
  actorName: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true, toJSON: jsonOptions });
notificationSchema.index({ createdAt: -1 });

const settingSchema = new mongoose.Schema({
  _id: { type: String, default: 'store' },
  general: {
    storeName: { type: String, trim: true, maxlength: 120, default: 'Swasti Natural' },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    email: { type: String, trim: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
  },
  store: {
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'BDT' },
    currencySymbol: { type: String, trim: true, maxlength: 5, default: '৳' },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    defaultLowStockThreshold: { type: Number, min: 0, default: 5 },
    orderPrefix: { type: String, trim: true, uppercase: true, maxlength: 6, default: 'SN' },
    allowGuestReviews: { type: Boolean, default: false },
    autoApproveReviews: { type: Boolean, default: false },
  },
}, { timestamps: true, toJSON: jsonOptions });

export const Coupon = mongoose.model('Coupon', couponSchema);
export const Discount = mongoose.model('Discount', discountSchema);
export const Banner = mongoose.model('Banner', bannerSchema);
export const ShippingMethod = mongoose.model('ShippingMethod', shippingMethodSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Setting = mongoose.model('Setting', settingSchema);
