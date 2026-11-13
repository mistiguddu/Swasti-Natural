import mongoose from 'mongoose';
import { jsonOptions, seoSchema } from './shared.js';

export const PRODUCT_STATUS = ['active', 'inactive', 'draft'];
export const PRODUCT_TYPES = ['simple', 'variable', 'digital', 'service'];
export const STOCK_STATUS = ['in_stock', 'out_of_stock', 'backorder'];

const money = { type: Number, min: 0, default: 0 };

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 60 },
  code: { type: String, trim: true, maxlength: 60, default: '' },
  brand: { type: String, trim: true, maxlength: 100, default: '' },
  productType: { type: String, enum: PRODUCT_TYPES, default: 'simple' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  shortDescription: { type: String, trim: true, maxlength: 500, default: '' },
  description: { type: String, trim: true, maxlength: 20000, default: '' },

  regularPrice: { ...money, required: true },
  salePrice: money,
  costPrice: money,
  discountPercentage: money,
  tax: { type: Number, min: 0, max: 100, default: 0 },
  currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'BDT' },

  stockQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  stockStatus: { type: String, enum: STOCK_STATUS, default: 'in_stock', index: true },
  manageStock: { type: Boolean, default: true },
  allowBackorders: { type: Boolean, default: false },

  image: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  gallery: { type: [String], default: [] },

  weight: { type: Number, min: 0, default: 0 },
  dimensions: {
    length: { type: Number, min: 0, default: 0 },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
  },
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  material: { type: String, trim: true, maxlength: 100, default: '' },
  warranty: { type: String, trim: true, maxlength: 200, default: '' },
  tags: { type: [String], default: [] },
  isFeatured: { type: Boolean, default: false, index: true },
  isBestSelling: { type: Boolean, default: false, index: true },
  isNewArrival: { type: Boolean, default: false, index: true },
  status: { type: String, enum: PRODUCT_STATUS, default: 'active', index: true },
  seo: { type: seoSchema, default: () => ({}) },

  soldCount: { type: Number, min: 0, default: 0 },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true, toJSON: jsonOptions });

productSchema.virtual('price').get(function price() {
  return this.salePrice > 0 && this.salePrice < this.regularPrice ? this.salePrice : this.regularPrice;
});

productSchema.virtual('isLowStock').get(function isLowStock() {
  return this.manageStock && this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});

export function computeStockStatus({ manageStock, stockQuantity, allowBackorders, stockStatus }) {
  if (!manageStock) return stockStatus || 'in_stock';
  if (stockQuantity > 0) return 'in_stock';
  return allowBackorders ? 'backorder' : 'out_of_stock';
}

productSchema.pre('validate', function derive() {
  const { regularPrice, salePrice } = this;
  this.discountPercentage = regularPrice > 0 && salePrice > 0 && salePrice < regularPrice
    ? Math.round((1 - salePrice / regularPrice) * 10000) / 100
    : 0;
  this.stockStatus = computeStockStatus(this);
});

productSchema.index({ name: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ regularPrice: 1 });

export default mongoose.model('Product', productSchema);
