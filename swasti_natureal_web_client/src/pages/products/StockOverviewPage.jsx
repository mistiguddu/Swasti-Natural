import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, CheckCircle2, Coins, Package, PackageX } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { DashboardCardSkeleton, DashboardChartSkeleton, ListSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { BarList } from '../../components/charts/ChartCard.jsx';
import { money, number } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

function ProductList({ title, items, empty, to, tone }) {
  return (
    <Card>
      <CardHeader title={title} description={`${items.length} product(s)`} actions={<Link to={to} className="text-xs font-semibold text-teal-700 hover:underline">{t('Manage')}</Link>} />
      {!items.length ? <EmptyState icon={CheckCircle2} title={empty} className="py-10" /> : (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 8).map((product) => (
            <li key={product.id} className="flex items-center gap-3 px-5 py-3">
              <Thumb src={product.thumbnail || product.image} size="h-9 w-9" icon={Package} />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.id}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-teal-700">{product.name}</Link>
                <p className="text-xs text-slate-400">{product.sku} · {product.category?.name}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${tone}`}>{number(product.stockQuantity)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function StockOverviewPage() {
  const { data, loading, error, reload } = useApi(() => api.get('/reports/inventory'), []);
  if (loading) return (<><PageHeader title="Stock Overview" /><div className="space-y-6"><DashboardCardSkeleton /><div className="grid gap-6 lg:grid-cols-2"><DashboardChartSkeleton /><Card><ListSkeleton /></Card></div></div></>);
  if (error) return (<><PageHeader title="Stock Overview" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);
  const { summary } = data;
  return (
    <>
      <PageHeader title="Stock Overview" description="Inventory health and stock value across the catalogue." />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Units in stock" value={number(summary.totalUnits)} icon={Boxes} footnote={`${number(summary.totalProducts)} products`} to="/products/stock" />
          <StatCard title="Stock value (retail)" value={money(summary.stockValueRetail)} icon={Coins} accent="emerald" footnote={`Cost ${money(summary.stockValueCost)}`} />
          <StatCard title="Low stock" value={number(summary.lowStock)} icon={AlertTriangle} accent="orange" footnote="At or below alert level" to="/inventory/low-stock" />
          <StatCard title="Out of stock" value={number(summary.outOfStock)} icon={PackageX} accent="rose" footnote={`${number(summary.backorder)} on backorder`} to="/inventory/out-of-stock" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Stock value by category" description="Retail value of units on hand" />
            <div className="p-5">
              {data.byCategory.length ? <BarList items={data.byCategory.map((row) => ({ key: row.id ?? row.name, label: row.name, value: row.value }))} valueFormatter={(value) => money(value)} secondary={(item) => `${number(data.byCategory.find((row) => (row.id ?? row.name) === item.key)?.units)} units`} /> : <EmptyState title="No products yet" className="py-8" />}
            </div>
          </Card>
          <ProductList title="Low stock" items={data.lowStock} empty="No products are running low" to="/inventory/low-stock" tone="text-orange-600" />
        </div>
        <ProductList title="Out of stock" items={data.outOfStock} empty="Everything is in stock" to="/inventory/out-of-stock" tone="text-rose-600" />
      </div>
    </>
  );
}
