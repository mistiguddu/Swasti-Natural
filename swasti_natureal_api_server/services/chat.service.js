import crypto from 'node:crypto';
import { ChatMessage, Conversation } from '../models/Chat.js';
import AppError from '../utils/AppError.js';
import { assertObjectId, escapeRegex, paginate, parseListQuery } from '../utils/query.js';
import { notify } from './notification.service.js';
import { emitAdmin, emitShopper, isOnline, isTeamOnline } from './chat-events.js';

const INITIAL_MESSAGES = 60;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isGuestToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const preview = (body) => body.replace(/\s+/g, ' ').slice(0, 160);

function messageView(message) {
  return {
    id: String(message._id), sender: message.sender, senderName: message.senderName,
    body: message.body, createdAt: message.createdAt, readAt: message.readAt,
  };
}

function customerView(conversation) {
  if (!conversation) return null;
  return {
    id: String(conversation._id), status: conversation.status, name: conversation.name,
    unread: conversation.unreadByCustomer, isGuest: !conversation.customer,
    createdAt: conversation.createdAt, lastMessageAt: conversation.lastMessageAt,
  };
}

function adminView(conversation) {
  const customer = conversation.customer && typeof conversation.customer === 'object' && conversation.customer.name
    ? { id: String(conversation.customer._id), name: conversation.customer.name, email: conversation.customer.email, phone: conversation.customer.phone ?? '' }
    : null;
  return {
    id: String(conversation._id), status: conversation.status, name: conversation.name, email: conversation.email,
    phone: conversation.phone, isGuest: !conversation.customer, customer, pageUrl: conversation.pageUrl,
    lastMessageAt: conversation.lastMessageAt, lastMessagePreview: conversation.lastMessagePreview, lastSender: conversation.lastSender,
    unread: conversation.unreadByAdmin, online: isOnline(conversation._id), createdAt: conversation.createdAt,
  };
}

/** Messages of a conversation: the latest page, or only those newer than `after` (for polling). */
async function loadMessages(conversationId, after) {
  const since = after ? new Date(after) : null;
  if (since && !Number.isNaN(since.getTime())) {
    const items = await ChatMessage.find({ conversation: conversationId, createdAt: { $gt: since } }).sort({ createdAt: 1 }).limit(200);
    return { messages: items.map(messageView), hasMore: false };
  }
  const items = await ChatMessage.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(INITIAL_MESSAGES + 1);
  const hasMore = items.length > INITIAL_MESSAGES;
  return { messages: items.slice(0, INITIAL_MESSAGES).reverse().map(messageView), hasMore };
}

/* ───────────────────────── Shopper side ───────────────────────── */

/**
 * Finds the shopper's conversation. Signed-in customers own theirs by account; guests by token.
 * When a guest signs in, their guest conversation is moved to their account so nothing is lost.
 */
export async function findShopperConversation(user, guestToken) {
  const customer = user?.role === 'user' ? user : null;
  const guest = isGuestToken(guestToken)
    ? await Conversation.findOne({ guestTokenHash: hashToken(guestToken), customer: null })
    : null;
  if (!customer) return guest;

  const own = await Conversation.findOne({ customer: customer._id }).sort({ lastMessageAt: -1 });
  if (own || !guest) return own;
  guest.customer = customer._id;
  guest.name = customer.name;
  guest.email = customer.email;
  if (customer.phone) guest.phone = customer.phone;
  guest.guestTokenHash = undefined;
  await guest.save();
  return guest;
}

export async function getShopperChat(user, guestToken, after) {
  const conversation = await findShopperConversation(user, guestToken);
  const teamOnline = isTeamOnline();
  if (!conversation) return { conversation: null, messages: [], hasMore: false, teamOnline };
  return { conversation: customerView(conversation), ...(await loadMessages(conversation._id, after)), teamOnline };
}

export async function sendShopperMessage(user, guestToken, data) {
  const customer = user?.role === 'user' ? user : null;
  if (user && !customer) throw new AppError('Staff accounts reply from the admin console.', 403);

  let conversation = await findShopperConversation(user, guestToken);
  let token = null;
  const isNew = !conversation;

  if (isNew) {
    if (customer) {
      conversation = new Conversation({ customer: customer._id, name: customer.name, email: customer.email, phone: customer.phone ?? '' });
    } else {
      if (!data.name || (!data.email && !data.phone)) {
        throw new AppError('Please tell us your name and an email or phone number so we can reply.', 400);
      }
      token = crypto.randomBytes(32).toString('hex');
      conversation = new Conversation({ guestTokenHash: hashToken(token), name: data.name, email: data.email, phone: data.phone });
    }
    conversation.pageUrl = data.pageUrl ?? '';
  }

  const wasClosed = conversation.status === 'closed';
  const message = new ChatMessage({ conversation: conversation._id, sender: 'customer', senderName: conversation.name, body: data.body });
  conversation.status = 'open';
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = preview(data.body);
  conversation.lastSender = 'customer';
  conversation.unreadByAdmin += 1;
  await conversation.save();
  await message.save();
  await conversation.populate('customer', 'name email phone');

  const view = messageView(message);
  emitAdmin({ type: 'message', isNew, conversation: adminView(conversation), message: view });
  emitShopper(conversation._id, { type: 'message', conversation: customerView(conversation), message: view });

  if (isNew || wasClosed) {
    await notify({
      type: 'chat.message',
      title: isNew ? `New chat from ${conversation.name}` : `${conversation.name} reopened a chat`,
      message: preview(data.body),
      link: `/messages?c=${conversation._id}`,
      actor: { name: conversation.email || conversation.phone || conversation.name },
    });
  }

  return { conversation: customerView(conversation), message: view, ...(token ? { token } : {}) };
}

export async function markShopperRead(user, guestToken) {
  const conversation = await findShopperConversation(user, guestToken);
  if (!conversation) return { unread: 0 };
  const at = new Date();
  const result = await ChatMessage.updateMany({ conversation: conversation._id, sender: 'admin', readAt: null }, { readAt: at });
  if (conversation.unreadByCustomer) await Conversation.updateOne({ _id: conversation._id }, { unreadByCustomer: 0 });
  if (result.modifiedCount) emitAdmin({ type: 'seen', conversationId: String(conversation._id), at });
  return { unread: 0 };
}

export async function shopperTyping(user, guestToken) {
  const conversation = await findShopperConversation(user, guestToken);
  if (conversation) emitAdmin({ type: 'typing', conversationId: String(conversation._id), name: conversation.name });
  return { ok: true };
}

/* ───────────────────────── Staff side ───────────────────────── */

export async function listConversations(query) {
  const listQuery = parseListQuery(query, { sortable: ['lastMessageAt', 'createdAt'], defaultSort: 'lastMessageAt', maxLimit: 100 });
  const filter = {};
  if (['open', 'closed'].includes(query.status)) filter.status = query.status;
  if (query.unread === 'true') filter.unreadByAdmin = { $gt: 0 };
  if (query.q) {
    const pattern = new RegExp(escapeRegex(String(query.q).slice(0, 80)), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }, { lastMessagePreview: pattern }];
  }
  const [result, open, closed, unread, unreadMessages] = await Promise.all([
    paginate(Conversation, filter, listQuery, { populate: { path: 'customer', select: 'name email phone' } }),
    Conversation.countDocuments({ status: 'open' }),
    Conversation.countDocuments({ status: 'closed' }),
    Conversation.countDocuments({ unreadByAdmin: { $gt: 0 } }),
    Conversation.aggregate([{ $group: { _id: null, total: { $sum: '$unreadByAdmin' } } }]),
  ]);
  return {
    items: result.items.map(adminView),
    pagination: result.pagination,
    counts: { open, closed, unread, unreadMessages: unreadMessages[0]?.total ?? 0 },
  };
}

export const unreadConversations = () => Conversation.countDocuments({ unreadByAdmin: { $gt: 0 } });

async function findConversation(id) {
  assertObjectId(id);
  const conversation = await Conversation.findById(id).populate('customer', 'name email phone');
  if (!conversation) throw new AppError('Conversation not found', 404);
  return conversation;
}

/** Marks the shopper's messages as read by the team and tells everyone (seen ticks, badges). */
async function markReadByTeam(conversation) {
  const at = new Date();
  const result = await ChatMessage.updateMany({ conversation: conversation._id, sender: 'customer', readAt: null }, { readAt: at });
  if (conversation.unreadByAdmin) await Conversation.updateOne({ _id: conversation._id }, { unreadByAdmin: 0 });
  conversation.unreadByAdmin = 0;
  if (result.modifiedCount) {
    emitShopper(conversation._id, { type: 'seen', at });
    emitAdmin({ type: 'read', conversationId: String(conversation._id) });
  }
}

export async function getConversation(id, after) {
  const conversation = await findConversation(id);
  await markReadByTeam(conversation);
  return { conversation: adminView(conversation), ...(await loadMessages(conversation._id, after)) };
}

export async function markConversationRead(id) {
  const conversation = await findConversation(id);
  await markReadByTeam(conversation);
  return { unread: 0 };
}

export async function replyToConversation(id, staff, body) {
  const conversation = await findConversation(id);
  // Replying means the team has seen everything before it.
  await markReadByTeam(conversation);
  const message = await ChatMessage.create({ conversation: conversation._id, sender: 'admin', senderName: staff.name, staff: staff._id, body });
  conversation.status = 'open';
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = preview(body);
  conversation.lastSender = 'admin';
  conversation.unreadByCustomer += 1;
  conversation.unreadByAdmin = 0;
  await conversation.save();

  const view = messageView(message);
  emitShopper(conversation._id, { type: 'message', conversation: customerView(conversation), message: view });
  emitAdmin({ type: 'message', conversation: adminView(conversation), message: view, staffId: String(staff._id) });
  return { conversation: adminView(conversation), message: view };
}

export async function staffTyping(id, staff) {
  assertObjectId(id);
  emitShopper(id, { type: 'typing', name: staff.name });
  return { ok: true };
}

export async function setConversationStatus(id, status) {
  const conversation = await findConversation(id);
  conversation.status = status;
  await conversation.save();
  const view = adminView(conversation);
  emitAdmin({ type: 'status', conversation: view });
  emitShopper(conversation._id, { type: 'status', conversation: customerView(conversation) });
  return view;
}

export async function deleteConversation(id) {
  const conversation = await findConversation(id);
  await ChatMessage.deleteMany({ conversation: conversation._id });
  await conversation.deleteOne();
  emitAdmin({ type: 'deleted', conversationId: String(conversation._id) });
  emitShopper(conversation._id, { type: 'deleted' });
}
