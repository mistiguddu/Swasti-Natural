import { useEffect, useState } from 'react';
import { storeApi } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

/**
 * Live server-side pricing for the cart (prices, discounts, coupon, shipping, tax, stock).
 * Re-quotes whenever the cart, coupon or shipping method changes.
 */
export function useCartQuote() {
  const cart = useCart();
  const { info } = useStore();
  const [state, setState] = useState({ quote: null, loading: cart.items.length > 0, error: null });
  const methods = info?.shippingMethods ?? [];
  // Default to the first shipping method if none (or an unknown one) is selected.
  const shippingMethod = methods.some((method) => method.id === cart.shippingMethod) ? cart.shippingMethod : methods[0]?.id ?? '';
  const key = JSON.stringify([cart.requestItems, cart.couponCode, shippingMethod]);

  useEffect(() => {
    if (!cart.items.length) {
      setState({ quote: null, loading: false, error: null });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    const timer = setTimeout(() => {
      storeApi.post('/store/cart/quote', { items: cart.requestItems, couponCode: cart.couponCode, shippingMethod: shippingMethod || null })
        .then((quote) => {
          if (!active) return;
          cart.syncFromQuote(quote.lines);
          setState({ quote, loading: false, error: null });
        })
        .catch((error) => active && setState((current) => ({ ...current, loading: false, error })));
    }, 250);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, info]);

  return { ...state, shippingMethod, methods };
}
