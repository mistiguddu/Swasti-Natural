'use client';

import { Suspense } from 'react';
import { RouteOutlet, RouterBase } from '@/router';
import ClientOnly from './ClientOnly.jsx';
import { BrandingProvider } from '@/context/BrandingContext.jsx';
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

/** Customer storefront (replaces StoreRoot.jsx). */
export default function StoreShell({ children }) {
  return (
    <ClientOnly>
      <EnglishOnly>
        <RouterBase base="">
          <BrandingProvider>
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
          </BrandingProvider>
        </RouterBase>
      </EnglishOnly>
    </ClientOnly>
  );
}
