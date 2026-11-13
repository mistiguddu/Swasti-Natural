import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireCustomer } from '../middlewares/customer.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as store from '../services/storefront.service.js';
import * as account from '../services/account.service.js';
import { createOrder, quoteCart } from '../services/order.service.js';
import { shopperChatRouter } from './chat.routes.js';
import {
  addressSchema, cartQuoteSchema, checkoutSchema, contactSchema, newsletterSchema, wishlistAddSchema,
} from '../middlewares/store-schemas.js';

const ok = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));
const created = (fn) => asyncHandler(async (req, res) => res.status(201).json({ data: await fn(req) }));

/* ── Public storefront (no login) ── */
export const storefrontRouter = Router();
storefrontRouter.get('/info', ok(() => store.storeInfo()));
storefrontRouter.get('/home', ok(() => store.home()));
storefrontRouter.get('/categories', ok(() => store.listCategories()));
storefrontRouter.get('/categories/:slug', ok((req) => store.getCategory(req.params.slug)));
storefrontRouter.get('/products', ok((req) => store.listProducts(req.query)));
storefrontRouter.get('/products/:slug', ok((req) => store.getProduct(req.params.slug)));
storefrontRouter.get('/products/:id/reviews', ok((req) => store.listProductReviews(req.params.id, req.query)));
storefrontRouter.post('/cart/quote', validate(cartQuoteSchema), ok((req) => quoteCart(req.validated.body)));
storefrontRouter.post('/contact', validate(contactSchema), created((req) => store.submitContact(req.validated.body)));
/* Live chat with the store team — guests and signed-in customers. */
storefrontRouter.use('/chat', shopperChatRouter);
storefrontRouter.post('/newsletter', validate(newsletterSchema), ok((req) => store.subscribe(req.validated.body.email)));

/* ── Customer account (signed-in customers only) ── */
const accountRouter = Router();
accountRouter.use(authenticate, requireCustomer);
accountRouter.get('/summary', ok((req) => account.accountSummary(req.user)));
accountRouter.get('/orders', ok((req) => account.listMyOrders(req.user, req.query)));
accountRouter.get('/orders/:orderNumber', ok((req) => account.getMyOrder(req.user, req.params.orderNumber)));
accountRouter.get('/addresses', ok((req) => account.listAddresses(req.user)));
accountRouter.post('/addresses', validate(addressSchema), created((req) => account.addAddress(req.user, req.validated.body)));
accountRouter.put('/addresses/:id', validate(addressSchema), ok((req) => account.updateAddress(req.user, req.params.id, req.validated.body)));
accountRouter.delete('/addresses/:id', ok((req) => account.deleteAddress(req.user, req.params.id)));
accountRouter.get('/wishlist', ok((req) => account.getWishlist(req.user)));
accountRouter.post('/wishlist', validate(wishlistAddSchema), ok((req) => account.addToWishlist(req.user, req.validated.body.productIds)));
accountRouter.delete('/wishlist/:productId', ok((req) => account.removeFromWishlist(req.user, req.params.productId)));

/**
 * Checkout for the signed-in customer. Prices, discounts, coupon, shipping, tax and stock
 * are all re-validated on the server by createOrder(); the client never sets amounts.
 */
accountRouter.post('/checkout', validate(checkoutSchema), created(async (req) => {
  const { items, customer, address, instructions, couponCode, shippingMethod, paymentMethod, saveAddress } = req.validated.body;
  const shippingAddress = {
    name: address.name, phone: address.phone, line1: address.line1, line2: address.area,
    city: address.district, state: address.division, postalCode: address.postalCode, country: 'Bangladesh',
  };
  const order = await createOrder({
    items, shippingAddress, billingAddress: shippingAddress, sameAsShipping: true, shippingMethod, paymentMethod,
    paymentStatus: 'pending', couponCode, notes: instructions,
  }, req.user);

  // Remember the phone number and (optionally) the address for next time.
  let changed = false;
  if (!req.user.phone && customer.phone) { req.user.phone = customer.phone; changed = true; }
  const known = req.user.addresses.some((saved) => saved.line1 === address.line1 && saved.district === address.district);
  if (saveAddress && !known && req.user.addresses.length < 10) {
    req.user.addresses.push({ ...address, isDefault: req.user.addresses.length === 0 });
    changed = true;
  }
  if (changed) await req.user.save();
  return { orderNumber: order.orderNumber, id: order.id, grandTotal: order.grandTotal };
}));

storefrontRouter.use('/account', accountRouter);
