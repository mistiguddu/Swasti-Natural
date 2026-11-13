import mongoose from 'mongoose';
import { jsonOptions, seoSchema, STATUS } from './shared.js';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
  image: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  shortDescription: { type: String, trim: true, maxlength: 300, default: '' },
  description: { type: String, trim: true, maxlength: 10000, default: '' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  seo: { type: seoSchema, default: () => ({}) },
  displayOrder: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: STATUS, default: 'active', index: true },
}, { timestamps: true, toJSON: jsonOptions });

categorySchema.index({ name: 1 });
categorySchema.index({ createdAt: -1 });

export default mongoose.model('Category', categorySchema);
