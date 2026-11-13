'use client';

import { Link, useOutletContext } from '@/router';
import { AlertTriangle, Bell, CheckCheck, FolderTree, Package, ShoppingCart, Star, Trash2, UserPlus } from 'lucide-react';
import { api } from '../api.js';
import { useApi, useListParams } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { Card, PageHeader } from '../components/ui/Card.jsx';
import { Button, IconButton } from '../components/ui/Button.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FilterDropdown } from '../components/ui/Controls.jsx';
import { ListSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/ui/EmptyState.jsx';
import { dateTime, relativeTime } from '../lib/format.js';
import { t } from '../i18n/index.js';

const ICONS = [
  ['order', ShoppingCart, 'bg-sky-50 text-sky-600'], ['payment', ShoppingCart, 'bg-sky-50 text-sky-600'], ['stock', AlertTriangle, 'bg-rose-50 text-rose-600'],
  ['product', Package, 'bg-violet-50 text-violet-600'], ['category', FolderTree, 'bg-emerald-50 text-emerald-600'], ['review', Star, 'bg-amber-50 text-amber-600'],
  ['customer', UserPlus, 'bg-teal-50 text-teal-600'], ['user', UserPlus, 'bg-teal-50 text-teal-600'],
];
const iconFor = (type) => ICONS.find(([prefix]) => type.startsWith(prefix)) ?? ['', Bell, 'bg-slate-100 text-slate-600'];

export default function NotificationsPage() {
  const toast = useToast();
  const { refreshBadges } = useOutletContext() ?? {};
  const { params, update, key } = useListParams({ limit: '20' });
  const { data, loading, error, reload, setData } = useApi(() => api.get('/notifications', params), [key]);

  async function markRead(item) {
    if (item.read) return;
    setData((current) => ({ ...current, unread: Math.max(0, current.unread - 1), items: current.items.map((row) => (row.id === item.id ? { ...row, read: true } : row)) }));
    await api.patch(`/notifications/${item.id}/read`).catch(() => {});
    refreshBadges?.();
  }

  async function markAll() {
    try {
      const result = await api.patch('/notifications/read-all');
      toast.success(`${result.updated} marked as read`);
      reload();
      refreshBadges?.();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/notifications/${item.id}`);
      reload();
      refreshBadges?.();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Orders, stock alerts, reviews and other store activity."
        actions={<Button variant="secondary" icon={CheckCheck} disabled={!data?.unread} onClick={markAll}>{t('Mark all as read')}</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <FilterDropdown label="Show" value={params.read ?? ''} onChange={(read) => update({ read })} options={[{ value: 'false', label: `Unread (${data?.unread ?? 0})` }, { value: 'true', label: 'Read' }]} />
          <FilterDropdown label="Type" value={params.type ?? ''} onChange={(type) => update({ type })} options={[{ value: 'order', label: 'Orders' }, { value: 'payment', label: 'Payments' }, { value: 'stock', label: 'Stock alerts' }, { value: 'product', label: 'Products' }, { value: 'category', label: 'Categories' }, { value: 'review', label: 'Reviews' }, { value: 'customer', label: 'Customers' }, { value: 'user', label: 'Users' }]} />
        </div>
        {loading && !data ? <ListSkeleton rows={8} /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? (
          <EmptyState icon={Bell} title="You’re all caught up" message="New activity will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((item) => {
              const [, Icon, tone] = iconFor(item.type);
              const content = (
                <>
                  <p className={`text-sm ${item.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{item.title}</p>
                  {item.message && <p className="text-sm text-slate-500">{item.message}</p>}
                  <p className="mt-0.5 text-xs text-slate-400" title={dateTime(item.createdAt)}>{relativeTime(item.createdAt)}{item.actorName ? ` · by ${item.actorName}` : ''}</p>
                </>
              );
              return (
                <li key={item.id} className={`group flex items-start gap-3 px-5 py-4 transition ${item.read ? '' : 'bg-teal-50/40'}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    {item.link ? <Link to={item.link} onClick={() => markRead(item)} className="block hover:[&>p:first-child]:text-teal-700">{content}</Link> : <div>{content}</div>}
                  </div>
                  {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label="Unread" />}
                  <div className="flex gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    {!item.read && <IconButton icon={CheckCheck} variant="teal" label="Mark as read" onClick={() => markRead(item)} />}
                    <IconButton icon={Trash2} variant="danger" label="Delete notification" onClick={() => remove(item)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} limits={[20, 50, 100]} />
      </Card>
    </>
  );
}
