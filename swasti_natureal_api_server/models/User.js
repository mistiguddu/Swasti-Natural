import mongoose from 'mongoose';

export const ROLES = ['user', 'admin', 'superadmin'];

const addressSchema = new mongoose.Schema({
  line1: { type: String, trim: true, maxlength: 200, default: '' },
  line2: { type: String, trim: true, maxlength: 200, default: '' },
  city: { type: String, trim: true, maxlength: 100, default: '' },
  state: { type: String, trim: true, maxlength: 100, default: '' },
  postalCode: { type: String, trim: true, maxlength: 20, default: '' },
  country: { type: String, trim: true, maxlength: 100, default: '' },
}, { _id: false });

/** Saved delivery address (Bangladesh: division → district → upazila/area). */
const savedAddressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 40, default: 'Home' },
  name: { type: String, trim: true, maxlength: 100, required: true },
  phone: { type: String, trim: true, maxlength: 30, required: true },
  division: { type: String, trim: true, maxlength: 60, required: true },
  district: { type: String, trim: true, maxlength: 60, required: true },
  area: { type: String, trim: true, maxlength: 100, default: '' },
  line1: { type: String, trim: true, maxlength: 250, required: true },
  postalCode: { type: String, trim: true, maxlength: 20, default: '' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'user', index: true },
  isActive: { type: Boolean, default: true },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  address: { type: addressSchema, default: () => ({}) },
  lastLoginAt: { type: Date, default: null },
  addresses: { type: [savedAddressSchema], default: [] },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  passwordResetTokenHash: { type: String, select: false, default: null },
  passwordResetExpires: { type: Date, select: false, default: null },
}, { timestamps: true, toJSON: { virtuals: true, transform: (_doc, value) => {
  delete value.passwordHash;
  delete value.passwordResetTokenHash;
  delete value.passwordResetExpires;
  delete value.__v;
  return value;
} } });

export { addressSchema };
export default mongoose.model('User', userSchema);
