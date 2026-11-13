'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

const CART_KEY = 'swasti_cart';
const CartContext = createContext(null);

function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    return Array.isArray(items) ? items.filter((item) => item?.product && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

/** Light snapshot for instant display; real prices always come from the server quote. */
const snapshot = (product) => ({
  name: product.name, slug: product.slug, image: product.thumbnail || product.image,
  price: product.price, regularPrice: product.regularPrice, availableQuantity: product.availableQuantity ?? null,
});

/**
 * Shopping cart, saved in localStorage (survives refresh). One row per product —
 * adding an existing product increases its quantity. Stock limits are checked here and
 * again on the server (quote + checkout).
 */
export function CartProvider({ children }) {
  const toast = useToast();
  const [items, setItems] = useState(readCart);
  const [couponCode, setCouponState] = useState(() => localStorage.getItem('swasti_coupon') ?? '');
  const [shippingMethod, setShippingState] = useState(() => localStorage.getItem('swasti_shipping') ?? '');
  const setCouponCode = useCallback((code) => { setCouponState(code); code ? localStorage.setItem('swasti_coupon', code) : localStorage.removeItem('swasti_coupon'); }, []);
  const setShippingMethod = useCallback((id) => { setShippingState(id); id ? localStorage.setItem('swasti_shipping', id) : localStorage.removeItem('swasti_shipping'); }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  // Keep several tabs in sync.
  useEffect(() => {
    const onStorage = (event) => { if (event.key === CART_KEY) setItems(readCart()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Latest items for synchronous decisions (React may run state updaters later).
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const add = useCallback((product, quantity = 1, { silent = false } = {}) => {
    if (!product.inStock) {
      toast.error(`${product.name} is out of stock`);
      return false;
    }
    const current = itemsRef.current;
    const existing = current.find((item) => item.product === product.id);
    const have = existing?.quantity ?? 0;
    const next = Math.min(have + quantity, product.availableQuantity ?? 999);
    if (next <= have) {
      if (!silent) toast.error(`Only ${product.availableQuantity} of ${product.name} available`);
      return false;
    }
    const updated = existing
      ? current.map((item) => (item.product === product.id ? { ...item, quantity: next, ...snapshot(product) } : item))
      : [...current, { product: product.id, quantity: next, ...snapshot(product) }];
    itemsRef.current = updated;
    setItems(updated);
    if (!silent) toast.success(`Added to cart: ${product.name}`);
    return true;
  }, [toast]);

  const update = useCallback((productId, quantity) => {
    setItems((current) => current.map((item) => {
      if (item.product !== productId) return item;
      const max = item.availableQuantity ?? 999;
      return { ...item, quantity: Math.max(1, Math.min(quantity, max)) };
    }));
  }, []);

  const remove = useCallback((productId) => setItems((current) => current.filter((item) => item.product !== productId)), []);
  const clear = useCallback(() => { setItems([]); setCouponCode(''); }, [setCouponCode]);

  /** Applies fresh server data (price, stock) to the saved rows. */
  const syncFromQuote = useCallback((lines) => {
    const byId = new Map(lines.map((line) => [line.product, line]));
    setItems((current) => {
      let changed = false;
      const next = current.map((item) => {
        const line = byId.get(item.product);
        if (!line || line.status === 'unavailable') return item;
        const updated = { ...item, name: line.name, slug: line.slug, image: line.image, price: line.price, regularPrice: line.regularPrice, availableQuantity: line.availableQuantity };
        if (JSON.stringify(updated) !== JSON.stringify(item)) changed = true;
        return updated;
      });
      return changed ? next : current;
    });
  }, []);

  const value = useMemo(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    has: (productId) => items.some((item) => item.product === productId),
    quantityOf: (productId) => items.find((item) => item.product === productId)?.quantity ?? 0,
    add, update, remove, clear, syncFromQuote,
    couponCode, setCouponCode, shippingMethod, setShippingMethod,
    requestItems: items.map((item) => ({ product: item.product, quantity: item.quantity })),
  }), [items, add, update, remove, clear, syncFromQuote, couponCode, setCouponCode, shippingMethod, setShippingMethod]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
