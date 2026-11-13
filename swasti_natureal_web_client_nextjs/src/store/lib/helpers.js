import { useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';

const RECENT_KEY = 'swasti_recently_viewed';

export function rememberViewed(productId) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').filter((id) => id !== productId);
    localStorage.setItem(RECENT_KEY, JSON.stringify([productId, ...list].slice(0, 12)));
  } catch { /* ignore */ }
}

export function recentlyViewed(excludeId) {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').filter((id) => id !== excludeId);
  } catch {
    return [];
  }
}

/** Sets the document title and meta description for SEO. */
export function usePageMeta(title, description) {
  const { info } = useStore();
  const storeName = info?.storeName ?? 'Swasti Natural';
  useEffect(() => {
    document.title = title ? `${title} | ${storeName}` : `${storeName}${info?.tagline ? ` — ${info.tagline}` : ''}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute('content', description.slice(0, 160));
  }, [title, description, storeName, info?.tagline]);
}

export const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
export const PAYMENT_LABELS = { cash_on_delivery: 'Cash on delivery', card: 'Card', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank_transfer: 'Bank transfer', other: 'Other' };
