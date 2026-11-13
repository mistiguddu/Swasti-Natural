import { z } from 'zod';

/* Request schemas for the customer storefront (/api/v1/store). */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalId = z.preprocess((value) => (value === '' || value == null ? null : value), objectId.nullable());
const text = (max) => z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().max(max));
const requiredText = (min, max) => z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().min(min).max(max));
const bool = z.preprocess((value) => value === true || value === 'true' || value === 1 || value === '1', z.boolean());
const body = (shape) => z.object({ body: z.object(shape) });
const quantity = z.preprocess((value) => (value === '' || value == null ? 1 : Number(value)), z.number().int().min(1).max(999));
const cartItems = z.array(z.object({ product: objectId, quantity })).max(100);
const phone = z.preprocess((value) => (value == null ? '' : String(value)), z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid mobile number'));
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);

export const cartQuoteSchema = body({ items: cartItems.default([]), couponCode: text(40), shippingMethod: optionalId });

/** Bangladesh delivery address: division → district → upazila/area. */
const address = {
  label: text(40).transform((value) => value || 'Home'),
  name: requiredText(2, 100),
  phone,
  division: requiredText(2, 60),
  district: requiredText(2, 60),
  area: text(100),
  line1: requiredText(5, 250),
  postalCode: text(20),
};
export const addressSchema = body({ ...address, isDefault: bool });

export const checkoutSchema = body({
  items: cartItems.min(1, 'Your cart is empty'),
  customer: z.object({ name: requiredText(2, 100), phone, email }),
  address: z.object(address),
  instructions: text(500),
  couponCode: text(40),
  shippingMethod: optionalId,
  paymentMethod: z.literal('cash_on_delivery', { message: 'Only cash on delivery is available right now' }),
  saveAddress: bool,
});

export const wishlistAddSchema = body({ productIds: z.array(objectId).min(1).max(200) });

export const contactSchema = body({
  name: requiredText(2, 100),
  email,
  phone: text(30),
  subject: text(150),
  message: requiredText(10, 3000),
});

export const newsletterSchema = body({ email });
