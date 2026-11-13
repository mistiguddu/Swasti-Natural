import mongoose from 'mongoose';
import { jsonOptions } from './shared.js';

/**
 * One support conversation between a shopper and the store team.
 * Signed-in customers are linked by `customer`; guests are identified by a random
 * token kept in their browser (only its SHA-256 hash is stored here).
 */
const conversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  guestTokenHash: { type: String, select: false },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessagePreview: { type: String, maxlength: 160, default: '' },
  lastSender: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  unreadByAdmin: { type: Number, min: 0, default: 0 },
  unreadByCustomer: { type: Number, min: 0, default: 0 },
  pageUrl: { type: String, trim: true, maxlength: 300, default: '' },
}, { timestamps: true, toJSON: jsonOptions });

const chatMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: String, enum: ['customer', 'admin'], required: true },
  senderName: { type: String, trim: true, maxlength: 100, default: '' },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  readAt: { type: Date, default: null },
}, { timestamps: true, toJSON: jsonOptions });
chatMessageSchema.index({ conversation: 1, createdAt: 1 });
conversationSchema.index({ guestTokenHash: 1 }, { unique: true, partialFilterExpression: { guestTokenHash: { $type: 'string' } } });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
