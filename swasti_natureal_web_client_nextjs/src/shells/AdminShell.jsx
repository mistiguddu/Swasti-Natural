'use client';

import { Suspense } from 'react';
import { RouteOutlet, RouterBase } from '@/router';
import ClientOnly from './ClientOnly.jsx';
import { AuthProvider, useAuth } from '@/context/AuthContext.jsx';
import { ToastProvider } from '@/context/ToastContext.jsx';
import { PreferencesProvider, useApplyTheme, usePreferences } from '@/context/PreferencesContext.jsx';
import { BrandingProvider } from '@/context/BrandingContext.jsx';
import AdminLayout from '@/components/layout/AdminLayout.jsx';
import LoginPage from '@/views/auth/LoginPage.jsx';
import NotFoundPage from '@/views/NotFoundPage.jsx';
import { NoAccessScreen, SessionErrorScreen } from '@/views/auth/SessionScreens.jsx';
import { AppShellSkeleton, DashboardCardSkeleton, DashboardChartSkeleton, Skeleton } from '@/components/ui/Skeleton.jsx';

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-64" />
      <DashboardCardSkeleton />
      <DashboardChartSkeleton />
    </div>
  );
}

/** Renders the page only when the user has `permission`. */
export function Guard({ permission, children }) {
  const { can } = useAuth();
  return !permission || can(permission) ? children : <NotFoundPage forbidden />;
}

/** Same session gate as the original App.jsx: skeleton → error → login → no access → dashboard. */
function AdminApp({ children }) {
  const auth = useAuth();
  // Theme applies to the signed-in app; the login page keeps its own light design.
  useApplyTheme(auth.status !== 'signed-out');

  if (auth.status === 'loading') return <AppShellSkeleton />;
  if (auth.status === 'error') return <SessionErrorScreen message={auth.error} onRetry={auth.retry} onLogout={auth.signOut} />;
  if (auth.status !== 'signed-in') return <LoginPage />;
  if (!auth.can('dashboard.view')) return <NoAccessScreen user={auth.user} onLogout={auth.signOut} />;

  return (
    <RouteOutlet content={<Suspense fallback={<PageSkeleton />}>{children}</Suspense>}>
      <AdminLayout />
    </RouteOutlet>
  );
}

/** Re-renders the whole admin when the language changes so every `t()` call updates. */
function LocalizedApp({ children }) {
  const { language } = usePreferences();
  return <AdminApp key={language}>{children}</AdminApp>;
}

/** Admin dashboard, served under /admin (replaces AdminRoot.jsx with basename "/admin"). */
export default function AdminShell({ children }) {
  return (
    <ClientOnly>
      <RouterBase base="/admin">
        <PreferencesProvider>
          <BrandingProvider>
            <ToastProvider>
              <AuthProvider>
                <LocalizedApp>{children}</LocalizedApp>
              </AuthProvider>
            </ToastProvider>
          </BrandingProvider>
        </PreferencesProvider>
      </RouterBase>
    </ClientOnly>
  );
}
