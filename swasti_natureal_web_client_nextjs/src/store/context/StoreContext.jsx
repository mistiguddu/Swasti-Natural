'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storeApi } from '../api.js';
import { setCurrency } from '../../lib/format.js';

const StoreContext = createContext(null);

/** Public store information (name, contact, currency, delivery and payment options). */
export function StoreProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    storeApi.get('/store/info').then((data) => {
      setCurrency(data.currency, data.currencySymbol);
      setInfo(data);
    }).catch(() => setInfo({ storeName: 'Swasti Natural', contact: {}, social: {}, shippingMethods: [], paymentMethods: ['cash_on_delivery'] }));
    storeApi.get('/store/categories').then(setCategories).catch(() => {});
  }, []);

  const value = useMemo(() => {
    const freeThresholds = (info?.shippingMethods ?? []).map((method) => method.freeShippingThreshold).filter((value) => value > 0);
    return {
      info,
      categories,
      topCategories: categories.filter((category) => !category.parent),
      freeShippingFrom: freeThresholds.length ? Math.min(...freeThresholds) : null,
    };
  }, [info, categories]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
