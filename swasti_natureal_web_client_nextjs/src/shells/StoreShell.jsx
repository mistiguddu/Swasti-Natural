'use client';

import { Suspense, useEffect } from 'react';
import { RouteOutlet, RouterBase } from '@/router';
import ClientOnly from './ClientOnly.jsx';
import { BrandingProvider, useBranding } from '@/context/BrandingContext.jsx';
import { storeThemeOf } from '@/store/themes.js';
import { ToastProvider } from '@/context/ToastContext.jsx';
import { setPageLanguage } from '@/i18n/index.js';
import { StoreProvider } from '@/store/context/StoreContext.jsx';
import { CustomerAuthProvider } from '@/store/context/CustomerAuthContext.jsx';
import { CartProvider } from '@/store/context/CartContext.jsx';
import { WishlistProvider } from '@/store/context/WishlistContext.jsx';
import StoreLayout from '@/store/components/Layout.jsx';
import { Container, Skel } from '@/store/components/ui.jsx';

export function PageFallback() {
  return (
    <Container className="space-y-6 py-12">
      <Skel className="h-10 w-1/3" />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skel key={i} className="aspect-[3/4] rounded-3xl" />)}</div>
    </Container>
  );
}

function EnglishOnly({ children }) {
  // The storefront is English; the admin language preference is not applied here.
  setPageLanguage('en');
  return children;
}

/**
 * Applies the storefront colour theme (Settings → Branding) to <html>. The admin's own
 * light/dark mode and accent are cleared so they never leak into the store.
 */
function StoreTheme({ children }) {
  const { storeTheme } = useBranding();
  const theme = storeThemeOf(storeTheme);
  useEffect(() => {
    const root = document.documentElement;
    delete root.dataset.theme;
    delete root.dataset.accent;
    if (root.dataset.storeTheme && root.dataset.storeTheme !== theme.key) {
      // Live switch: fade colours instead of a hard jump.
      root.classList.add('theme-switching');
      setTimeout(() => root.classList.remove('theme-switching'), 450);
    }
    root.dataset.storeTheme = theme.key;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.meta);
    return () => { delete root.dataset.storeTheme; };
  }, [theme]);
  return children;
}

/** Customer storefront (replaces StoreRoot.jsx). */
export default function StoreShell({ children }) {
  return (
    <ClientOnly>
      <EnglishOnly>
        <RouterBase base="">
          <BrandingProvider>
            <StoreTheme>
            <ToastProvider>
              <StoreProvider>
                <CustomerAuthProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <RouteOutlet content={<Suspense fallback={<PageFallback />}>{children}</Suspense>}>
                        <StoreLayout />
                      </RouteOutlet>
                    </WishlistProvider>
                  </CartProvider>
                </CustomerAuthProvider>
              </StoreProvider>
            </ToastProvider>
            </StoreTheme>
          </BrandingProvider>
        </RouterBase>
      </EnglishOnly>
    </ClientOnly>
  );
}
