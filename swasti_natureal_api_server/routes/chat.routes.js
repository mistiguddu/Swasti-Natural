import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import * as chat from '../services/chat.service.js';
import { streamChannel } from '../services/chat-events.js';

const ok = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

const text = (max) => z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().max(max));
const messageBody = z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().min(1, 'Type a message').max(2000, 'Messages can be up to 2000 characters'));

const shopperMessageSchema = z.object({
  body: z.object({
    body: messageBody,
    name: text(100).refine((value) => !value || value.length >= 2, 'Enter your name'),
    email: text(254).refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email').transform((value) => value.toLowerCase()),
    phone: text(30).refine((value) => !value || /^\+?[0-9\s-]{7,20}$/.test(value), 'Enter a valid mobile number'),
    pageUrl: text(300),
  }),
});
const replySchema = z.object({ body: z.object({ body: messageBody }) });
const statusSchema = z.object({ body: z.object({ status: z.enum(['open', 'closed']) }) });

/** Signs in the customer when a valid token is sent, but lets guests through too. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const user = await User.findById(verifyAccessToken(token).sub);
      if (user?.isActive) req.user = user;
    } catch { /* expired or invalid: continue as a guest */ }
  }
  next();
});

const guestToken = (req) => req.get('x-chat-token') ?? '';

/* ── Shopper (guest or signed-in customer): /api/v1/store/chat ── */
export const shopperChatRouter = Router();
shopperChatRouter.use(optionalAuth);
shopperChatRouter.get('/', ok((req) => chat.getShopperChat(req.user, guestToken(req), req.query.after)));
shopperChatRouter.post('/messages', validate(shopperMessageSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await chat.sendShopperMessage(req.user, guestToken(req), req.validated.body) });
}));
shopperChatRouter.post('/read', ok((req) => chat.markShopperRead(req.user, guestToken(req))));
shopperChatRouter.post('/typing', ok((req) => chat.shopperTyping(req.user, guestToken(req))));
/** Live updates for the shopper's own conversation (Server-Sent Events). 204 until a conversation exists. */
shopperChatRouter.get('/stream', asyncHandler(async (req, res) => {
  const conversation = await chat.findShopperConversation(req.user, guestToken(req));
  if (!conversation) return res.status(204).end();
  return streamChannel(req, res, `conv:${conversation._id}`, { conversationId: conversation._id });
}));

/* ── Store team inbox: /api/v1/chats ── */
export const adminChatRouter = Router();
adminChatRouter.use(authenticate, requirePermission('customers.manage'));
adminChatRouter.get('/', ok((req) => chat.listConversations(req.query)));
adminChatRouter.get('/unread-count', ok(async () => ({ unread: await chat.unreadConversations() })));
/** Live inbox updates for staff (Server-Sent Events): new messages, seen receipts, typing, presence. */
adminChatRouter.get('/stream', (req, res) => streamChannel(req, res, 'admin'));
adminChatRouter.get('/:id', ok((req) => chat.getConversation(req.params.id, req.query.after)));
adminChatRouter.post('/:id/messages', validate(replySchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await chat.replyToConversation(req.params.id, req.user, req.validated.body.body) });
}));
adminChatRouter.post('/:id/read', ok((req) => chat.markConversationRead(req.params.id)));
adminChatRouter.post('/:id/typing', ok((req) => chat.staffTyping(req.params.id, req.user)));
adminChatRouter.patch('/:id', validate(statusSchema), ok((req) => chat.setConversationStatus(req.params.id, req.validated.body.status)));
adminChatRouter.delete('/:id', asyncHandler(async (req, res) => {
  await chat.deleteConversation(req.params.id);
  res.status(204).end();
}));
