'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

/** Bundled defaults (public/) used until an admin uploads their own. */
export const DEFAULT_BRANDING = {
  storeName: 'Swasti Natural',
  tagline: '',
  logo: '',
  logoMark: '',
};
export const DEFAULT_LOGO = '/logo.png';
export const DEFAULT_LOGO_MARK = '/logo-mark.png';
const DEFAULT_FAVICON = '/favicon.png';
const CACHE_KEY = 'swasti_branding';

const BrandingContext = createContext(null);

function readCache() {
  try {
    return { ...DEFAULT_BRANDING, ...JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') };
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Project name, tagline and logos (Settings → Branding). Public, so the login page can show them too. */
export function BrandingProvider({ children }) {
  const [branding, setBrandingState] = useState(readCache);

  const setBranding = useCallback((value) => {
    const next = { ...DEFAULT_BRANDING, ...value };
    setBrandingState(next);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.get('/settings/public');
    setBranding(data);
    return data;
  }, [setBranding]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  // Browser tab title + icon follow the brand.
  useEffect(() => {
    document.title = `${branding.storeName} | Admin`;
    const icon = branding.logoMark || DEFAULT_FAVICON;
    for (const rel of ['icon', 'apple-touch-icon']) {
      const link = document.querySelector(`link[rel="${rel}"]`);
      if (link) {
        link.href = rel === 'icon' || branding.logoMark ? icon : '/apple-touch-icon.png';
        if (rel === 'icon') link.removeAttribute('sizes');
      }
    }
  }, [branding.storeName, branding.logoMark]);

  const value = useMemo(() => ({
    ...branding,
    logoUrl: branding.logo || DEFAULT_LOGO,
    logoMarkUrl: branding.logoMark || DEFAULT_LOGO_MARK,
    setBranding,
    refresh,
  }), [branding, setBranding, refresh]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
