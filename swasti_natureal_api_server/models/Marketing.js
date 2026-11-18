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
  adminReplyAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  /** Customer photos (public /uploads/reviews/... paths), up to 4. */
  images: { type: [String], default: [] },
  /** The reviewer has a delivered order containing this product. */
  verifiedPurchase: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0, min: 0 },
  helpfulVoters: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [], select: false },
  reportCount: { type: Number, default: 0, min: 0, index: true },
  reports: {
    type: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: { type: String, trim: true, maxlength: 300, default: '' }, createdAt: { type: Date, default: Date.now } }],
    default: [],
    select: false,
  },
  editedAt: { type: Date, default: null },
}, { timestamps: true, toJSON: jsonOptions });
reviewSchema.index({ product: 1, customer: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, maxlength: 500, default: '' },
  link: { type: String, default: '' },
  actorName: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true, toJSON: jsonOptions });
notificationSchema.index({ createdAt: -1 });

/** Colour themes for the customer storefront (the admin dashboard has its own, per-browser accent). */
export const STORE_THEMES = ['forest', 'lagoon', 'ocean', 'royal', 'plum', 'berry', 'sunset', 'charcoal'];

const settingSchema = new mongoose.Schema({
  _id: { type: String, default: 'store' },
  general: {
    storeName: { type: String, trim: true, maxlength: 120, default: 'Swasti Natural' },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    email: { type: String, trim: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
    facebook: { type: String, trim: true, maxlength: 300, default: '' },
    instagram: { type: String, trim: true, maxlength: 300, default: '' },
    youtube: { type: String, trim: true, maxlength: 300, default: '' },
    whatsapp: { type: String, trim: true, maxlength: 30, default: '' },
  },
  /** Uploaded brand images (empty = use the logo bundled with the web client). */
  branding: {
    logo: { type: String, default: '' },
    logoMark: { type: String, default: '' },
    /** Storefront colour theme, chosen in Settings → Branding. */
    storeTheme: { type: String, enum: STORE_THEMES, default: 'forest' },
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

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  subject: { type: String, trim: true, maxlength: 150, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ['new', 'read'], default: 'new', index: true },
}, { timestamps: true, toJSON: jsonOptions });

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
}, { timestamps: true, toJSON: jsonOptions });

export const Coupon = mongoose.model('Coupon', couponSchema);
export const Discount = mongoose.model('Discount', discountSchema);
export const Banner = mongoose.model('Banner', bannerSchema);
export const ShippingMethod = mongoose.model('ShippingMethod', shippingMethodSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Setting = mongoose.model('Setting', settingSchema);
export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
