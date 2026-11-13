import mongoose from 'mongoose';

export const seoSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 160, default: '' },
  description: { type: String, trim: true, maxlength: 320, default: '' },
  keywords: { type: [String], default: [] },
}, { _id: false });

export const jsonOptions = {
  virtuals: true,
  transform: (_doc, value) => {
    delete value.__v;
    return value;
  },
};

export const STATUS = ['active', 'inactive'];
