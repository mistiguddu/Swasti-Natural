'use client';

import { useState } from 'react';
import { Link, useSearchParams } from '@/router';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, Banknote, Boxes, Clock3, FolderTree, Package, ShoppingCart, UserCog, Users,
} from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { PageHeader, Card, CardHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { DateRangeFilter, DATE_RANGES } from '../../components/ui/Controls.jsx';
import { DashboardCardSkeleton, ListSkeleton, OrderTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { BarList, ChartCard, ChartLegend, ChartTooltip } from '../../components/charts/ChartCard.jsx';
import { axisProps, BRAND, gridProps, ORDER_STATUS_COLORS, SERIES } from '../../lib/chartTheme.js';
import { bucketLabel, dateTime, monthLabel, money, number, relativeTime, titleCase } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import RecentMessages from './RecentMessages.jsx';
import { digits, t } from '../../i18n/index.js';

function useRangeParams() {
  const [params, setParams] = useSearchParams();
  const value = { range: params.get('range') || '30d', from: params.get('from') || '', to: params.get('to') || '' };
  const query = value.range === 'custom' ? value : { range: value.range };
  const set = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  return [value, query, set];
}

function periodLabel(range) {
  return range.range === 'custom' ? `${range.from} → ${range.to}` : DATE_RANGES.find((item) => item.value === range.range)?.label;
}

function SummaryCards({ query, label }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/overview', query), [JSON.stringify(query)]);
  if (loading && !data) return <DashboardCardSkeleton count={8} />;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  const { cards } = data;
  const vs = 'vs previous period';
  return (
    <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
      <StatCard title="Total Revenue" value={money(cards.revenue.value)} icon={Banknote} accent="teal" change={cards.revenue.change} footnote={vs} to="/reports/revenue" />
      <StatCard title="Total Orders" value={number(cards.orders.value)} icon={ShoppingCart} accent="sky" change={cards.orders.change} footnote={vs} to="/orders" />
      <StatCard title="Total Products" value={number(cards.products.value)} icon={Package} accent="violet" footnote={t('+{count} added · {period}', { count: number(cards.products.current), period: label })} to="/products" />
      <StatCard title="Total Categories" value={number(cards.categories.value)} icon={FolderTree} accent="emerald" footnote={t('+{count} added · {period}', { count: number(cards.categories.current), period: label })} to="/categories" />
      <StatCard title="Total Customers" value={number(cards.customers.value)} icon={Users} accent="orange" change={cards.customers.change} footnote={t('{count} new · vs previous period', { count: number(cards.customers.current) })} to="/customers" />
      <StatCard title="Total Users" value={number(cards.users.value)} icon={UserCog} accent="slate" change={cards.users.change} footnote={t('{count} new · vs previous period', { count: number(cards.users.current) })} to="/users" />
      <StatCard title="Pending Orders" value={number(cards.pendingOrders.value)} icon={Clock3} accent="amber" footnote="Awaiting confirmation" to="/orders/status/pending" />
      <StatCard title="Low Stock Products" value={number(cards.lowStock.value)} icon={AlertTriangle} accent="rose" footnote={t('{count} out of stock', { count: number(cards.lowStock.outOfStock) })} to="/inventory/low-stock" />
    </div>
  );
}

function SalesChart({ query }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/sales', query), [JSON.stringify(query)]);
  const series = data?.series ?? [];
  const granularity = data?.granularity;
  const title = granularity === 'hour' ? 'Hourly Sales' : granularity === 'month' ? 'Monthly Sales' : 'Daily Sales';
  return (
    <ChartCard
      title={title}
      description={data ? t('{revenue} from {orders} orders · avg {average}', { revenue: money(data.totals.revenue), orders: number(data.totals.orders), average: money(data.totals.averageOrderValue) }) : 'Revenue over the selected period'}
      loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.totals.orders}
      className="xl:col-span-2"
    >
      <div className="h-72" role="img" aria-label={`${title} chart`}>
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={(value) => bucketLabel(value, granularity)} minTickGap={24} />
            <YAxis {...axisProps} width={56} tickFormatter={(value) => money(value, { compact: true })} />
            <Tooltip cursor={{ stroke: 'var(--color-slate-300)', strokeDasharray: '3 3' }} content={<ChartTooltip labelFormatter={(value) => bucketLabel(value, granularity)} valueFormatter={(value, entry) => (entry.dataKey === 'revenue' ? money(value) : number(value))} />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={BRAND} strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }} />
            <Area type="monotone" dataKey="orders" name="Orders" stroke="transparent" fill="transparent" activeDot={false} legendType="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function OrderStatusChart({ query }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/order-stats', query), [JSON.stringify(query)]);
  const rows = (data?.byStatus ?? []).filter((row) => row.count > 0);
  return (
    <ChartCard title="Order Statistics" description={data ? t('{count} orders in this period', { count: number(data.total) }) : 'Orders by status'} loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.total}>
      <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative h-48 w-48 shrink-0" role="img" aria-label="Orders by status donut chart">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={rows} dataKey="count" nameKey="key" innerRadius="62%" outerRadius="100%" paddingAngle={rows.length > 1 ? 2 : 0} stroke="var(--color-surface)" strokeWidth={2}>
                {rows.map((row) => <Cell key={row.key} fill={ORDER_STATUS_COLORS[row.key]} name={titleCase(row.key)} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${number(value)} orders`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold text-slate-900">{number(data?.total)}</span>
            <span className="text-[11px] text-slate-500">{t('orders')}</span>
          </div>
        </div>
        {/* Labelled values double as the accessible table view */}
        <ul className="w-full space-y-1.5 text-sm">
          {(data?.byStatus ?? []).map((row) => (
            <li key={row.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ORDER_STATUS_COLORS[row.key] }} aria-hidden="true" />
              <Link to={`/orders/status/${row.key}`} className="text-slate-600 hover:text-teal-700">{titleCase(row.key)}</Link>
              <span className="ml-auto font-semibold text-slate-900 tabular-nums">{number(row.count)}</span>
              <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{data.total ? Math.round((row.count / data.total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

function RevenueCharts() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/revenue', { year }), [year]);
  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  const yearPicker = (
    <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Year" className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-surface px-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
      {years.map((value) => <option key={value} value={value}>{digits(value)}</option>)}
    </select>
  );
  const empty = data && !data.months.some((row) => row.revenue || row.previousRevenue);
  const growth = data?.totals.growth;
  return (
    <>
      <ChartCard title="Monthly Revenue" description={data ? t('{revenue} in {year}', { revenue: money(data.totals.revenue), year }) : 'Revenue per month'} actions={yearPicker} loading={loading && !data} error={error} onRetry={reload} isEmpty={empty}>
        <div className="h-64" role="img" aria-label={`Monthly revenue ${year}`}>
          <ResponsiveContainer>
            <BarChart data={data?.months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} tickFormatter={monthLabel} />
              <YAxis {...axisProps} width={56} tickFormatter={(value) => money(value, { compact: true })} />
              <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} content={<ChartTooltip valueFormatter={(value, entry) => (entry.dataKey === 'revenue' ? money(value) : number(value))} />} />
              <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Revenue Growth"
        description={data ? `${digits(year)} vs ${digits(year - 1)}${growth == null ? '' : ` · ${growth > 0 ? '+' : ''}${growth}%`}` : 'Year over year'}
        actions={<ChartLegend items={[{ label: digits(year), color: SERIES[0] }, { label: digits(year - 1), color: SERIES[1], dashed: true }]} />}
        loading={loading && !data} error={error} onRetry={reload} isEmpty={empty}
      >
        <div className="h-64" role="img" aria-label="Revenue growth, this year versus last year">
          <ResponsiveContainer>
            <LineChart data={data?.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} tickFormatter={monthLabel} />
              <YAxis {...axisProps} width={56} tickFormatter={(value) => money(value, { compact: true })} />
              <Tooltip cursor={{ stroke: 'var(--color-slate-300)', strokeDasharray: '3 3' }} content={<ChartTooltip valueFormatter={(value) => money(value)} />} />
              <Line type="monotone" dataKey="revenue" name={String(year)} stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="previousRevenue" name={String(year - 1)} stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Yearly Sales" description="Revenue over the last five years" loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.yearly.some((row) => row.revenue)}>
        <div className="h-64" role="img" aria-label="Yearly sales">
          <ResponsiveContainer>
            <BarChart data={data?.yearly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="year" {...axisProps} tickFormatter={(value) => digits(value)} />
              <YAxis {...axisProps} width={56} tickFormatter={(value) => money(value, { compact: true })} />
              <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} content={<ChartTooltip valueFormatter={(value, entry) => (entry.dataKey === 'revenue' ? money(value) : number(value))} />} />
              <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </>
  );
}

function TopProducts({ query }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/top-products', { ...query, limit: 6 }), [JSON.stringify(query)]);
  return (
    <ChartCard title="Top Selling Products" description="By revenue in this period" actions={<Link to="/reports/products" className="text-xs font-semibold text-teal-700 hover:underline">{t('Report')}</Link>} loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.length} height="h-64">
      <BarList items={(data ?? []).map((row) => ({ key: row.id, label: row.name, value: row.revenue, image: row.image }))} valueFormatter={(value) => money(value)} secondary={(item) => t('{count} sold', { count: number(data.find((row) => row.id === item.key)?.quantity) })} />
    </ChartCard>
  );
}

function TopCategories({ query }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/top-categories', { ...query, limit: 6 }), [JSON.stringify(query)]);
  return (
    <ChartCard title="Best Selling Categories" description="By revenue in this period" actions={<Link to="/reports/categories" className="text-xs font-semibold text-teal-700 hover:underline">{t('Report')}</Link>} loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.length} height="h-64">
      <BarList items={(data ?? []).map((row) => ({ key: row.id ?? row.name, label: row.name, value: row.revenue }))} color={SERIES[0]} valueFormatter={(value) => money(value)} secondary={(item) => t('{count} units', { count: number(data.find((row) => (row.id ?? row.name) === item.key)?.quantity) })} />
    </ChartCard>
  );
}

function CustomerGrowth({ query }) {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/customer-growth', query), [JSON.stringify(query)]);
  return (
    <ChartCard title="Customer Growth" description={data ? t('{new} new · {total} total', { new: number(data.totals.newCustomers), total: number(data.totals.totalCustomers) }) : 'Total customers over time'} loading={loading && !data} error={error} onRetry={reload} isEmpty={data && !data.totals.totalCustomers}>
      <div className="h-64" role="img" aria-label="Customer growth">
        <ResponsiveContainer>
          <AreaChart data={data?.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="customerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.2} />
                <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={(value) => bucketLabel(value, data?.granularity)} minTickGap={24} />
            <YAxis {...axisProps} width={40} allowDecimals={false} tickFormatter={(value) => number(value)} />
            <Tooltip cursor={{ stroke: 'var(--color-slate-300)', strokeDasharray: '3 3' }} content={<ChartTooltip labelFormatter={(value) => bucketLabel(value, data?.granularity)} valueFormatter={(value) => number(value)} />} />
            <Area type="monotone" dataKey="total" name="Total customers" stroke={SERIES[0]} strokeWidth={2} fill="url(#customerFill)" activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="customers" name="New" stroke="transparent" fill="transparent" activeDot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function RecentOrders() {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/recent-orders', { limit: 7 }), []);
  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Recent Orders" description="Latest orders across all statuses" actions={<Link to="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">{t('View all')} <ArrowRight size={13} /></Link>} />
      {loading && !data ? <OrderTableSkeleton rows={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.length ? (
        <EmptyState icon={ShoppingCart} title="No orders yet" message="Orders appear here as soon as they’re placed." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-500 uppercase"><th className="px-5 py-2.5">{t('Order')}</th><th className="px-3 py-2.5">{t('Customer')}</th><th className="px-3 py-2.5">{t('Total')}</th><th className="px-3 py-2.5">{t('Status')}</th><th className="px-5 py-2.5 text-right">{t('Date')}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3"><Link to={`/orders/${order.id}`} className="font-semibold text-teal-700 hover:underline">{order.orderNumber}</Link></td>
                  <td className="px-3 py-3"><span className="block max-w-44 truncate text-slate-700">{order.customerInfo?.name}</span></td>
                  <td className="px-3 py-3 font-semibold text-slate-900 tabular-nums">{money(order.grandTotal)}</td>
                  <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-slate-500">{dateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RecentActivities() {
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/activities', { limit: 8 }), []);
  return (
    <Card>
      <CardHeader title="Recent Activities" description="What happened in your store" actions={<Link to="/notifications" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">{t('All')} <ArrowRight size={13} /></Link>} />
      {loading && !data ? <ListSkeleton rows={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.length ? (
        <EmptyState icon={Boxes} title="No activity yet" />
      ) : (
        <ol className="relative space-y-4 px-5 py-4 before:absolute before:top-6 before:bottom-6 before:left-[27px] before:w-px before:bg-slate-200">
          {data.map((activity) => (
            <li key={activity.id} className="relative flex gap-3 pl-0">
              <span className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-surface ${activity.type.startsWith('order') ? 'bg-sky-500' : activity.type.startsWith('stock') ? 'bg-rose-500' : activity.type.includes('deleted') ? 'bg-slate-400' : 'bg-teal-500'}`} />
              <div className="min-w-0 flex-1">
                {activity.link ? <Link to={activity.link} className="text-sm font-semibold text-slate-800 hover:text-teal-700">{activity.title}</Link> : <p className="text-sm font-semibold text-slate-800">{activity.title}</p>}
                {activity.message && <p className="truncate text-xs text-slate-500">{activity.message}</p>}
                <p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(activity.createdAt)}{activity.actorName ? ` · ${activity.actorName}` : ''}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const [range, query, setRange] = useRangeParams();
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Overview' }]}
        title={`${greeting}, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Here’s how your store is performing."
      >
        <DateRangeFilter value={range} onChange={setRange} className="mt-5" />
      </PageHeader>

      <div className="space-y-6">
        <SummaryCards query={query} label={t(periodLabel(range)?.toLowerCase())} />
        {can('customers.manage') && <RecentMessages />}
        <div className="grid gap-6 xl:grid-cols-3">
          <SalesChart query={query} />
          <OrderStatusChart query={query} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <RevenueCharts />
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <TopProducts query={query} />
          <TopCategories query={query} />
          <CustomerGrowth query={query} />
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <RecentOrders />
          <RecentActivities />
        </div>
      </div>
    </>
  );
}
