'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { storeApi } from '../api.js';
import { useCustomer } from './CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const GUEST_KEY = 'swasti_wishlist';
const WishlistContext = createContext(null);

const readGuest = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

/**
 * Wishlist: guests keep it in localStorage; signed-in customers keep it on the server.
 * When a guest signs in, their local wishlist is merged into their account.
 */
export function WishlistProvider({ children }) {
  const { isSignedIn, status } = useCustomer();
  const toast = useToast();
  const [ids, setIds] = useState(readGuest);
  const merged = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isSignedIn) {
      merged.current = false;
      setIds(readGuest());
      return;
    }
    const guest = readGuest();
    const request = guest.length && !merged.current ? storeApi.post('/store/account/wishlist', { productIds: guest }) : storeApi.get('/store/account/wishlist');
    request.then((data) => {
      merged.current = true;
      localStorage.removeItem(GUEST_KEY);
      setIds(data.ids);
    }).catch(() => {});
  }, [isSignedIn, status]);

  const toggle = useCallback(async (product) => {
    const inList = ids.includes(product.id);
    if (!isSignedIn) {
      const next = inList ? ids.filter((id) => id !== product.id) : [product.id, ...ids].slice(0, 200);
      localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      setIds(next);
    } else {
      setIds((current) => (inList ? current.filter((id) => id !== product.id) : [product.id, ...current]));
      try {
        const data = inList ? await storeApi.delete(`/store/account/wishlist/${product.id}`) : await storeApi.post('/store/account/wishlist', { productIds: [product.id] });
        setIds(data.ids);
      } catch (error) {
        setIds(ids);
        toast.error(error.message);
        return;
      }
    }
    toast.success(inList ? 'Removed from wishlist' : `Saved to wishlist: ${product.name}`);
  }, [ids, isSignedIn, toast]);

  const value = useMemo(() => ({ ids, count: ids.length, has: (id) => ids.includes(id), toggle }), [ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
