'use client';

import { Link, useParams, useSearchParams } from '@/router';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Banknote, Boxes, Coins, Download, FolderTree, Package, Percent, ReceiptText, ShoppingCart, TrendingUp, UserPlus, Users,
} from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { DateRangeFilter } from '../../components/ui/Controls.jsx';
import { DashboardCardSkeleton, DashboardChartSkeleton, TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { ChartCard, ChartLegend, ChartTooltip } from '../../components/charts/ChartCard.jsx';
import { axisProps, BRAND, gridProps, ORDER_STATUS_COLORS, SERIES } from '../../lib/chartTheme.js';
import { bucketLabel, money, number, PAYMENT_METHOD_LABELS, titleCase } from '../../lib/format.js';
import { downloadCsv } from '../../lib/csv.js';
import NotFoundPage from '../NotFoundPage.jsx';
import { t } from '../../i18n/index.js';

const moneyTick = (value) => money(value, { compact: true });

function SeriesChart({ data, lines, kind = 'line', valueFormatter = money, height = 'h-80' }) {
  const Chart = kind === 'bar' ? BarChart : kind === 'area' ? AreaChart : LineChart;
  return (
    <div className={height} role="img" aria-label={lines.map((line) => line.name).join(', ')}>
      <ResponsiveContainer>
        <Chart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(value) => bucketLabel(value, data.granularity)} minTickGap={24} />
          <YAxis {...axisProps} width={58} tickFormatter={valueFormatter === money ? moneyTick : (value) => number(value, { compact: true })} allowDecimals={false} />
          <Tooltip cursor={kind === 'bar' ? { fill: 'var(--color-slate-100)' } : { stroke: 'var(--color-slate-300)', strokeDasharray: '3 3' }} content={<ChartTooltip labelFormatter={(value) => bucketLabel(value, data.granularity)} valueFormatter={(value) => valueFormatter(value)} />} />
          {lines.map((line) => (kind === 'bar'
            ? <Bar key={line.key} dataKey={line.key} name={line.name} fill={line.color} radius={[4, 4, 0, 0]} maxBarSize={28} stackId={line.stack} />
            : kind === 'area'
              ? <Area key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} fill={line.color} fillOpacity={0.12} strokeWidth={2} activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
              : <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={false} strokeDasharray={line.dashed ? '5 4' : undefined} activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }} />))}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleTable({ columns, rows, empty = 'No data for this period' }) {
  if (!rows.length) return <EmptyState title={empty} className="py-10" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{columns.map((column) => <th key={column.label} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.id ?? row.key ?? row.date ?? index} className="hover:bg-slate-50/70">
              {columns.map((column) => <td key={column.label} className={`px-4 py-3 text-slate-700 ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const seriesColumns = (data, fields) => [
  { label: 'Period', render: (row) => bucketLabel(row.date, data.granularity), csv: (row) => row.date },
  ...fields.map((field) => ({ label: field.label, key: field.key, align: 'right', render: (row) => (field.money ? money(row[field.key]) : number(row[field.key])) })),
];

/** Each report: summary cards, charts, table and CSV definition. */
const REPORTS = {
  sales: {
    title: 'Sales Report', description: 'Orders, items and revenue over time (cancelled and returned orders excluded).', endpoint: '/reports/sales',
    cards: (data) => [
      { title: 'Revenue', value: money(data.summary.revenue), icon: Banknote },
      { title: 'Orders', value: number(data.summary.orders), icon: ShoppingCart, accent: 'sky' },
      { title: 'Items sold', value: number(data.summary.items), icon: Package, accent: 'violet' },
      { title: 'Average order', value: money(data.summary.averageOrderValue), icon: ReceiptText, accent: 'amber', footnote: `Discounts ${money(data.summary.discount)} · Shipping ${money(data.summary.shipping)} · Tax ${money(data.summary.tax)}` },
    ],
    charts: (data) => [
      { title: 'Revenue', isEmpty: !data.summary.orders, body: <SeriesChart data={data} kind="area" lines={[{ key: 'revenue', name: 'Revenue', color: BRAND }]} /> },
      { title: 'Orders', isEmpty: !data.summary.orders, body: <SeriesChart data={data} kind="bar" valueFormatter={number} lines={[{ key: 'orders', name: 'Orders', color: SERIES[0] }]} height="h-64" /> },
    ],
    table: (data) => ({ title: 'Breakdown', rows: [...data.series].reverse().filter((row) => row.orders), columns: seriesColumns(data, [{ key: 'orders', label: 'Orders' }, { key: 'items', label: 'Items' }, { key: 'revenue', label: 'Revenue', money: true }]) }),
  },
  revenue: {
    title: 'Revenue Report', description: 'Revenue, cost of goods and gross profit, with payment-method split.', endpoint: '/reports/revenue',
    cards: (data) => [
      { title: 'Revenue', value: money(data.summary.revenue), icon: Banknote, change: data.summary.growth, footnote: 'vs previous period' },
      { title: 'Cost of goods', value: money(data.summary.cost), icon: Coins, accent: 'slate' },
      { title: 'Gross profit', value: money(data.summary.profit), icon: TrendingUp, accent: 'emerald' },
      { title: 'Margin', value: `${data.summary.margin}%`, icon: Percent, accent: 'violet', footnote: `Discounts given ${money(data.summary.discount)}` },
    ],
    charts: (data) => [
      {
        title: 'Revenue vs profit', isEmpty: !data.summary.revenue,
        actions: <ChartLegend items={[{ label: 'Revenue', color: SERIES[0] }, { label: 'Profit', color: SERIES[2] }]} />,
        body: <SeriesChart data={data} lines={[{ key: 'revenue', name: 'Revenue', color: SERIES[0] }, { key: 'profit', name: 'Profit', color: SERIES[2] }]} />,
      },
      {
        title: 'By payment method', isEmpty: !data.byPaymentMethod.length,
        body: <SimpleTable rows={data.byPaymentMethod} columns={[{ label: 'Method', render: (row) => PAYMENT_METHOD_LABELS[row.method] ?? row.method }, { label: 'Orders', align: 'right', render: (row) => number(row.orders) }, { label: 'Revenue', align: 'right', render: (row) => money(row.revenue) }]} />,
      },
    ],
    table: (data) => ({ title: 'Breakdown', rows: [...data.series].reverse().filter((row) => row.revenue), columns: seriesColumns(data, [{ key: 'revenue', label: 'Revenue', money: true }, { key: 'cost', label: 'Cost', money: true }, { key: 'profit', label: 'Profit', money: true }, { key: 'discount', label: 'Discounts', money: true }]) }),
  },
  products: {
    title: 'Product Performance', description: 'Best-performing products by revenue in the selected period.', endpoint: '/reports/products',
    cards: (data) => [
      { title: 'Products sold', value: number(data.summary.productsSold), icon: Package },
      { title: 'Units sold', value: number(data.summary.units), icon: Boxes, accent: 'sky' },
      { title: 'Revenue', value: money(data.summary.revenue), icon: Banknote, accent: 'emerald' },
      { title: 'Gross profit', value: money(data.summary.profit), icon: TrendingUp, accent: 'violet' },
    ],
    charts: (data) => [{
      title: 'Top 10 by revenue', isEmpty: !data.items.length,
      body: (
        <div className="h-80" role="img" aria-label="Top products by revenue">
          <ResponsiveContainer>
            <BarChart data={data.items.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={moneyTick} />
              <YAxis type="category" dataKey="name" {...axisProps} width={150} tickFormatter={(value) => (value.length > 22 ? `${value.slice(0, 21)}…` : value)} />
              <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} content={<ChartTooltip valueFormatter={(value) => money(value)} />} />
              <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    }],
    table: (data) => ({
      title: 'All products', rows: data.items, columns: [
        { label: '#', render: (_, index) => index + 1, csv: (_, index) => index + 1 },
        { label: 'Product', render: (row) => <div className="flex items-center gap-2.5"><Thumb src={row.image} size="h-8 w-8" icon={Package} />{row.deleted ? <span>{row.name} <span className="text-xs text-slate-400">(deleted)</span></span> : <Link to={`/products/${row.id}`} className="font-medium hover:text-teal-700">{row.name}</Link>}</div>, csv: (row) => row.name },
        { label: 'SKU', key: 'sku' },
        { label: 'Units', key: 'quantity', align: 'right', render: (row) => number(row.quantity) },
        { label: 'Orders', key: 'orders', align: 'right', render: (row) => number(row.orders) },
        { label: 'Revenue', key: 'revenue', align: 'right', render: (row) => money(row.revenue) },
        { label: 'Profit', key: 'profit', align: 'right', render: (row) => money(row.profit) },
        { label: 'In stock', key: 'stockQuantity', align: 'right', render: (row) => (row.stockQuantity == null ? '—' : number(row.stockQuantity)) },
      ],
    }),
  },
  categories: {
    title: 'Category Performance', description: 'Revenue and units sold by product category.', endpoint: '/reports/categories',
    cards: (data) => [
      { title: 'Categories with sales', value: number(data.summary.categories), icon: FolderTree },
      { title: 'Units sold', value: number(data.summary.units), icon: Boxes, accent: 'sky' },
      { title: 'Revenue', value: money(data.summary.revenue), icon: Banknote, accent: 'emerald' },
    ],
    charts: (data) => [{
      title: 'Revenue by category', isEmpty: !data.items.length,
      body: (
        <div className="h-80" role="img" aria-label="Revenue by category">
          <ResponsiveContainer>
            <BarChart data={data.items.slice(0, 12)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} tickFormatter={(value) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)} />
              <YAxis {...axisProps} width={58} tickFormatter={moneyTick} />
              <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} content={<ChartTooltip valueFormatter={(value) => money(value)} />} />
              <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    }],
    table: (data) => ({
      title: 'All categories', rows: data.items, columns: [
        { label: 'Category', render: (row) => (row.id ? <Link to={`/categories/${row.id}/products`} className="font-medium hover:text-teal-700">{row.name}</Link> : row.name), csv: (row) => row.name },
        { label: 'Orders', key: 'orders', align: 'right', render: (row) => number(row.orders) },
        { label: 'Units', key: 'quantity', align: 'right', render: (row) => number(row.quantity) },
        { label: 'Revenue', key: 'revenue', align: 'right', render: (row) => money(row.revenue) },
        { label: 'Share', align: 'right', render: (row) => `${data.summary.revenue ? Math.round((row.revenue / data.summary.revenue) * 1000) / 10 : 0}%`, csv: (row) => (data.summary.revenue ? (row.revenue / data.summary.revenue) * 100 : 0).toFixed(1) },
      ],
    }),
  },
  customers: {
    title: 'Customer Report', description: 'New customers, buyers and your most valuable customers.', endpoint: '/reports/customers',
    cards: (data) => [
      { title: 'New customers', value: number(data.summary.newCustomers), icon: UserPlus },
      { title: 'Total customers', value: number(data.summary.totalCustomers), icon: Users, accent: 'sky' },
      { title: 'Buyers', value: number(data.summary.buyers), icon: ShoppingCart, accent: 'violet', footnote: 'Placed at least one order' },
      { title: 'Returning buyers', value: number(data.summary.returningBuyers), icon: TrendingUp, accent: 'emerald', footnote: 'More than one order' },
    ],
    charts: (data) => [{ title: 'New customers', isEmpty: !data.summary.newCustomers, body: <SeriesChart data={data} kind="bar" valueFormatter={number} lines={[{ key: 'customers', name: 'New customers', color: SERIES[0] }]} /> }],
    table: (data) => ({
      title: 'Top customers by spending', rows: data.topCustomers, columns: [
        { label: '#', render: (_, index) => index + 1, csv: (_, index) => index + 1 },
        { label: 'Customer', render: (row) => <Link to={`/customers/${row.id}`} className="font-medium hover:text-teal-700">{row.name}</Link>, csv: (row) => row.name },
        { label: 'Email', key: 'email' },
        { label: 'Orders', key: 'orders', align: 'right', render: (row) => number(row.orders) },
        { label: 'Spent', key: 'spent', align: 'right', render: (row) => money(row.spent) },
      ],
    }),
  },
  orders: {
    title: 'Order Report', description: 'Order volume, fulfilment and cancellations.', endpoint: '/reports/orders',
    cards: (data) => {
      const by = Object.fromEntries(data.byStatus.map((row) => [row.key, row.count]));
      return [
        { title: 'Orders', value: number(data.total), icon: ShoppingCart },
        { title: 'Delivered', value: number(by.delivered), icon: Package, accent: 'emerald', footnote: data.total ? `${Math.round(((by.delivered ?? 0) / data.total) * 100)}% of orders` : undefined },
        { title: 'In progress', value: number((by.pending ?? 0) + (by.confirmed ?? 0) + (by.processing ?? 0) + (by.shipped ?? 0)), icon: Boxes, accent: 'sky' },
        { title: 'Cancelled / returned', value: number((by.cancelled ?? 0) + (by.returned ?? 0)), icon: AlertTriangle, accent: 'rose' },
      ];
    },
    charts: (data) => [
      {
        title: 'Orders over time', isEmpty: !data.total,
        actions: <ChartLegend items={[{ label: 'All orders', color: SERIES[0] }, { label: 'Delivered', color: SERIES[2] }, { label: 'Cancelled/returned', color: SERIES[7] }]} />,
        body: <SeriesChart data={data} valueFormatter={number} lines={[{ key: 'orders', name: 'All orders', color: SERIES[0] }, { key: 'delivered', name: 'Delivered', color: SERIES[2] }, { key: 'cancelled', name: 'Cancelled/returned', color: SERIES[7], dashed: true }]} />,
      },
      {
        title: 'By status', isEmpty: !data.total,
        body: <SimpleTable rows={data.byStatus} columns={[{ label: 'Status', render: (row) => <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ORDER_STATUS_COLORS[row.key] }} />{titleCase(row.key)}</span> }, { label: 'Orders', align: 'right', render: (row) => number(row.count) }, { label: 'Value', align: 'right', render: (row) => money(row.amount) }]} />,
      },
    ],
    table: (data) => ({
      title: 'By payment method', rows: data.byPaymentMethod.filter((row) => row.count), columns: [
        { label: 'Method', render: (row) => PAYMENT_METHOD_LABELS[row.key], csv: (row) => row.key },
        { label: 'Orders', key: 'count', align: 'right', render: (row) => number(row.count) },
        { label: 'Value', key: 'amount', align: 'right', render: (row) => money(row.amount) },
      ],
    }),
  },
  inventory: {
    title: 'Inventory Report', description: 'Current stock levels and value. Not affected by the date range.', endpoint: '/reports/inventory', noRange: true,
    cards: (data) => [
      { title: 'Units in stock', value: number(data.summary.totalUnits), icon: Boxes, footnote: `${number(data.summary.totalProducts)} products` },
      { title: 'Retail value', value: money(data.summary.stockValueRetail), icon: Banknote, accent: 'emerald', footnote: `Cost ${money(data.summary.stockValueCost)}` },
      { title: 'Low stock', value: number(data.summary.lowStock), icon: AlertTriangle, accent: 'orange' },
      { title: 'Out of stock', value: number(data.summary.outOfStock), icon: Package, accent: 'rose' },
    ],
    charts: (data) => [{
      title: 'Stock value by category', isEmpty: !data.byCategory.length,
      body: <SimpleTable rows={data.byCategory} columns={[{ label: 'Category', key: 'name' }, { label: 'Products', align: 'right', render: (row) => number(row.products) }, { label: 'Units', align: 'right', render: (row) => number(row.units) }, { label: 'Value', align: 'right', render: (row) => money(row.value) }]} />,
    }],
    table: (data) => ({
      title: 'Products needing attention', rows: [...data.outOfStock, ...data.lowStock], empty: 'All products are well stocked', columns: [
        { label: 'Product', render: (row) => <Link to={`/products/${row.id}`} className="font-medium hover:text-teal-700">{row.name}</Link>, csv: (row) => row.name },
        { label: 'SKU', key: 'sku' },
        { label: 'Category', render: (row) => row.category?.name ?? '—', csv: (row) => row.category?.name },
        { label: 'Stock', key: 'stockQuantity', align: 'right', render: (row) => number(row.stockQuantity) },
        { label: 'Alert at', key: 'lowStockThreshold', align: 'right', render: (row) => number(row.lowStockThreshold) },
        { label: 'Status', render: (row) => <StatusBadge status={row.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'low_stock'} />, csv: (row) => row.stockStatus },
      ],
    }),
  },
};

export default function ReportPage() {
  const { type } = useParams();
  const config = REPORTS[type];
  const [params, setParams] = useSearchParams();
  const range = { range: params.get('range') || '30d', from: params.get('from') || '', to: params.get('to') || '' };
  const query = range.range === 'custom' ? range : { range: range.range };
  const result = useApi(
    () => api.get(config.endpoint, config.noRange ? {} : query).then((value) => ({ type, value })),
    [type, JSON.stringify(query)],
    { enabled: Boolean(config) },
  );
  const { loading, error, reload } = result;
  // Ignore data left over from a different report while the new one loads.
  const data = result.data?.type === type ? result.data.value : null;
  if (!config) return <NotFoundPage />;

  const table = data ? config.table(data) : null;
  const exportCsv = () => downloadCsv(`${type}-report-${range.range === 'custom' ? `${range.from}_${range.to}` : range.range}`, table.columns.map((column) => ({
    label: column.label,
    value: (row) => {
      const index = table.rows.indexOf(row);
      if (column.csv) return column.csv(row, index);
      return column.key ? row[column.key] : '';
    },
  })), table.rows);

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={<Button variant="secondary" icon={Download} disabled={!table?.rows.length} onClick={exportCsv}>{t('Export CSV')}</Button>}
      >
        {!config.noRange && <DateRangeFilter className="mt-5" value={range} onChange={(next) => setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)), { replace: true })} />}
      </PageHeader>
      {error ? <Card><ErrorState error={error} onRetry={reload} /></Card> : !data ? (
        <div className="space-y-6"><DashboardCardSkeleton /><DashboardChartSkeleton height="h-80" /><Card><TableSkeleton rows={6} columns={['w-32', 'w-20', 'w-20', 'w-24']} /></Card></div>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className={`grid gap-4 sm:grid-cols-2 ${config.cards(data).length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
            {config.cards(data).map((card) => <StatCard key={card.title} accent="teal" {...card} />)}
          </div>
          <div className={`grid gap-6 ${config.charts(data).length > 1 ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''}`}>
            {config.charts(data).map((chart) => <ChartCard key={chart.title} title={chart.title} actions={chart.actions} isEmpty={chart.isEmpty}>{chart.body}</ChartCard>)}
          </div>
          <Card>
            <CardHeader title={table.title} description={`${table.rows.length} row(s)`} />
            <SimpleTable columns={table.columns} rows={table.rows} empty={table.empty} />
          </Card>
        </div>
      )}
    </>
  );
}
