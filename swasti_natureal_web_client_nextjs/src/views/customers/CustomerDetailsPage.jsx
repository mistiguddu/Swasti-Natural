'use client';

import { Link, useNavigate, useParams } from '@/router';
import { Banknote, Mail, MapPin, Pencil, Phone, ReceiptText, ShoppingBag, Star, UserRound, Users } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { Card, CardHeader, DetailItem, PageHeader } from '../../components/ui/Card.jsx';
import { LinkButton } from '../../components/ui/Button.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import AsyncPicker from '../../components/ui/AsyncPicker.jsx';
import { CategoryDetailsSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { date, dateTime, money, number, titleCase } from '../../lib/format.js';
import { Avatar } from './CustomerListPage.jsx';
import { t } from '../../i18n/index.js';

/** /customers/details without an id: pick a customer first. */
function CustomerLookup() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Customer Details" description="Find a customer to see their profile, orders and spending." />
      <Card className="max-w-2xl p-6">
        <AsyncPicker
          label="Find a customer"
          placeholder="Search by name, email or phone…"
          fetchOptions={(search) => api.get('/customers', { search, limit: 10, sortBy: search ? 'name' : 'createdAt' }).then((data) => data.items)}
          renderItem={(item) => (<><Avatar name={item.name} size="h-8 w-8 text-xs" /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-800">{item.name}</span><span className="block truncate text-xs text-slate-400">{item.email}</span></span><span className="text-xs text-slate-500 tabular-nums">{number(item.totalOrders)} orders</span></>)}
          onSelect={(item) => navigate(`/customers/${item.id}`)}
          emptyText="No customers found"
        />
        <EmptyState icon={Users} title="Choose a customer" message="Or browse everyone in the customer list." action={<LinkButton variant="secondary" to="/customers">{t('Open customer list')}</LinkButton>} className="py-10" />
      </Card>
    </>
  );
}

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const { data: customer, loading, error, reload } = useApi(() => api.get(`/customers/${id}`), [id], { enabled: Boolean(id) });
  if (!id) return <CustomerLookup />;
  const breadcrumb = [{ label: 'Customers', to: '/customers' }, { label: customer?.name ?? 'Details' }];
  if (loading) return (<><PageHeader breadcrumb={breadcrumb} title="Customer" /><CategoryDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="Customer" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);

  const address = customer.address ?? {};
  const addressLine = [address.line1, address.line2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader breadcrumb={breadcrumb} title={customer.name} description={`Customer since ${date(customer.createdAt)}`} actions={<LinkButton to={`/users/${customer.id}/edit`} variant="secondary" icon={Pencil}>{t('Edit profile')}</LinkButton>} />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="self-start">
          <div className="flex flex-col items-center border-b border-slate-100 p-6 text-center">
            <Avatar name={customer.name} size="h-20 w-20 text-3xl" />
            <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{customer.name}</h2>
            <div className="mt-2"><StatusBadge status={customer.isActive ? 'active' : 'inactive'} /></div>
          </div>
          <dl className="space-y-4 p-5">
            <DetailItem label="Email"><span className="inline-flex items-center gap-2"><Mail size={14} className="text-slate-400" />{customer.email}</span></DetailItem>
            <DetailItem label="Phone">{customer.phone ? <span className="inline-flex items-center gap-2"><Phone size={14} className="text-slate-400" />{customer.phone}</span> : null}</DetailItem>
            <DetailItem label="Address">{addressLine ? <span className="inline-flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />{addressLine}</span> : null}</DetailItem>
            <DetailItem label="Registered">{dateTime(customer.createdAt)}</DetailItem>
            <DetailItem label="Last login">{customer.lastLoginAt ? dateTime(customer.lastLoginAt) : 'Never'}</DetailItem>
            <DetailItem label="Last order">{customer.lastOrderAt ? dateTime(customer.lastOrderAt) : 'No orders yet'}</DetailItem>
          </dl>
        </Card>
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total orders" value={number(customer.totalOrders)} icon={ShoppingBag} accent="sky" />
            <StatCard title="Total spending" value={money(customer.totalSpent)} icon={Banknote} accent="teal" footnote="Excludes cancelled & returned" />
            <StatCard title="Average order" value={money(customer.averageOrderValue)} icon={ReceiptText} accent="violet" />
            <StatCard title="Reviews" value={number(customer.reviewCount)} icon={Star} accent="amber" />
          </div>
          {Object.keys(customer.statusBreakdown).length > 0 && (
            <Card className="flex flex-wrap gap-2 p-4">
              {Object.entries(customer.statusBreakdown).map(([status, count]) => <StatusBadge key={status} status={status} label={`${titleCase(status)} · ${count}`} />)}
            </Card>
          )}
          <Card>
            <CardHeader title="Recent orders" icon={UserRound} actions={<Link to={`/orders?search=${encodeURIComponent(customer.email)}`} className="text-xs font-semibold text-teal-700 hover:underline">{t('All orders')}</Link>} />
            {!customer.recentOrders.length ? <EmptyState icon={ShoppingBag} title="No orders yet" action={<LinkButton size="sm" to="/orders/new">{t('Create an order')}</LinkButton>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr className="border-b border-slate-100 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase"><th className="px-5 py-2.5">{t('Order')}</th><th className="px-3 py-2.5">{t('Items')}</th><th className="px-3 py-2.5">{t('Total')}</th><th className="px-3 py-2.5">{t('Status')}</th><th className="px-5 py-2.5 text-right">{t('Date')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3"><Link to={`/orders/${order.id}`} className="font-semibold text-teal-700 hover:underline">{order.orderNumber}</Link></td>
                        <td className="px-3 py-3 tabular-nums">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{money(order.grandTotal)}</td>
                        <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500">{date(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
