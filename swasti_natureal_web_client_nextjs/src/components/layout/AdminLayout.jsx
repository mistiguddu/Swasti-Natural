'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from '@/router';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { ViewAsBanner } from './RoleSwitcher.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChatRealtimeProvider } from '../../context/ChatRealtimeContext.jsx';

/** Shared shell: collapsible sidebar, top bar, and a page outlet. Exposes `refreshBadges` via outlet context. */
export default function AdminLayout() {
  const { can, activeRole } = useAuth();
  const { pathname } = useLocation();
  // Collapsed (icons only) by default; expanding is remembered per browser.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('swasti_sidebar_collapsed') !== '0');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({ notifications: 0, pendingOrders: 0, messages: 0 });

  const refreshBadges = useCallback(async () => {
    const [notifications, orders, chats] = await Promise.all([
      api.get('/notifications/unread-count').catch(() => null),
      can('orders.manage') ? api.get('/orders', { status: 'pending', limit: 1 }).catch(() => null) : null,
      can('customers.manage') ? api.get('/chats/unread-count').catch(() => null) : null,
    ]);
    setBadges({ notifications: notifications?.unread ?? 0, pendingOrders: orders?.pagination?.total ?? 0, messages: chats?.unread ?? 0 });
  }, [can]);

  useEffect(() => { refreshBadges(); }, [pathname, refreshBadges]);

  // Live chat activity → refresh badges (debounced so a burst of events makes one request).
  const badgeTimer = useRef(null);
  const onChatActivity = useCallback(() => {
    clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(refreshBadges, 400);
  }, [refreshBadges]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const timer = setInterval(refreshBadges, 20000);
    return () => clearInterval(timer);
  }, [refreshBadges]);

  const toggleCollapse = () => setCollapsed((value) => {
    localStorage.setItem('swasti_sidebar_collapsed', value ? '0' : '1');
    return !value;
  });

  return (
    <ChatRealtimeProvider enabled={can('customers.manage')} onActivity={onChatActivity}>
    <div className="flex min-h-screen bg-slate-50 font-body text-slate-800 selection:bg-teal-200">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          <ViewAsBanner />
          <Topbar onOpenMobile={() => setMobileOpen(true)} unread={badges.notifications} messages={badges.messages} />
        </div>
        {/* Remount pages when the active role changes so every screen refetches with the new permissions. */}
        <main key={activeRole} id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={{ refreshBadges }} />
        </main>
      </div>
    </div>
    </ChatRealtimeProvider>
  );
}
