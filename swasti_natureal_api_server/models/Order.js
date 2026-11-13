import mongoose from 'mongoose';
import { jsonOptions } from './shared.js';

export const ORDER_STATUS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'];
export const PAYMENT_METHODS = ['cash_on_delivery', 'card', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'other'];
/** Orders in these statuses do not count as revenue. */
export const NON_REVENUE_STATUS = ['cancelled', 'returned'];

const orderAddressSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  line1: { type: String, trim: true, maxlength: 200, default: '' },
  line2: { type: String, trim: true, maxlength: 200, default: '' },
  city: { type: String, trim: true, maxlength: 100, default: '' },
  state: { type: String, trim: true, maxlength: 100, default: '' },
  postalCode: { type: String, trim: true, maxlength: 20, default: '' },
  country: { type: String, trim: true, maxlength: 100, default: '' },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  image: { type: String, default: '' },
  price: { type: Number, min: 0, required: true },
  costPrice: { type: Number, min: 0, default: 0 },
  quantity: { type: Number, min: 1, required: true },
  discount: { type: Number, min: 0, default: 0 },
  tax: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, required: true },
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  by: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  items: { type: [orderItemSchema], validate: [(items) => items.length > 0, 'An order needs at least one item'] },
  subtotal: { type: Number, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  shippingCharge: { type: Number, min: 0, default: 0 },
  tax: { type: Number, min: 0, default: 0 },
  grandTotal: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'BDT' },
  couponCode: { type: String, default: '' },
  shippingMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'ShippingMethod', default: null },
  shippingMethodName: { type: String, default: '' },
  trackingNumber: { type: String, trim: true, maxlength: 100, default: '' },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash_on_delivery' },
  paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
  transactionId: { type: String, trim: true, maxlength: 100, default: '' },
  paidAt: { type: Date, default: null },
  status: { type: String, enum: ORDER_STATUS, default: 'pending', index: true },
  billingAddress: { type: orderAddressSchema, default: () => ({}) },
  shippingAddress: { type: orderAddressSchema, default: () => ({}) },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  timeline: { type: [timelineSchema], default: [] },
  stockRestored: { type: Boolean, default: false },
}, { timestamps: true, toJSON: jsonOptions });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
