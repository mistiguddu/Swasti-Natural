import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, Package, PackageX, Plus } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import DataTable, { Thumb } from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ProductTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { money, number } from '../../lib/format.js';
import { StockCell } from './ProductListPage.jsx';

const PRESETS = {
  low: { title: 'Low Stock Products', description: 'Products at or below their minimum stock alert.', stock: 'low' },
  out_of_stock: { title: 'Out of Stock Products', description: 'Products that can’t be sold until restocked.', stock: 'out_of_stock' },
};

function StockEditor({ product, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(product.stockQuantity));
  const [saving, setSaving] = useState(false);
  const dirty = Number(value) !== product.stockQuantity && value !== '';

  async function save(mode, quantity) {
    setSaving(true);
    try {
      const updated = await api.patch(`/products/${product.id}/stock`, { mode, quantity });
      setValue(String(updated.stockQuantity));
      onSaved(updated);
      toast.success(`${product.name}: stock is now ${updated.stockQuantity}`);
    } catch (error) {
      toast.error(error.message);
      setValue(String(product.stockQuantity));
    } finally {
      setSaving(false);
    }
  }

  if (!product.manageStock) return <span className="text-xs text-slate-400">Not tracked</span>;
  return (
    <div className={`flex items-center gap-1 ${saving ? 'opacity-60' : ''}`}>
      <IconButton icon={Minus} label="Decrease by 1" disabled={saving} onClick={() => save('adjust', -1)} />
      <input
        type="number"
        step="1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && dirty && save('set', Number(value))}
        aria-label={`Stock for ${product.name}`}
        className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-center text-sm font-semibold tabular-nums outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
      <IconButton icon={Plus} label="Increase by 1" disabled={saving} onClick={() => save('adjust', 1)} />
      {dirty && <Button size="sm" icon={Check} busy={saving} busyLabel="Saving" onClick={() => save('set', Number(value))}>Save</Button>}
    </div>
  );
}

export default function StockManagementPage({ preset }) {
  const config = PRESETS[preset];
  const { params, update, toggleSort, key } = useListParams({ sortBy: 'stockQuantity', sortOrder: 'asc' });
  const query = { ...params, ...(config ? { stock: config.stock } : {}) };
  const { data, loading, error, reload, setData } = useApi(() => api.get('/products', query), [key, preset]);
  const { data: categories } = useApi(() => api.get('/categories', { all: 'true' }), []);

  const replace = (updated) => setData((current) => ({ ...current, items: current.items.map((row) => (row.id === updated.id ? { ...row, ...updated, category: row.category, subcategory: row.subcategory } : row)) }));

  const columns = [
    {
      key: 'product', header: 'Product', sortKey: 'name', render: (row) => (
        <div className="flex min-w-56 items-center gap-3">
          <Thumb src={row.thumbnail || row.image} icon={Package} />
          <div className="min-w-0">
            <Link to={`/products/${row.id}`} className="line-clamp-1 font-semibold text-slate-900 hover:text-teal-700">{row.name}</Link>
            <p className="text-xs text-slate-400">{row.sku} · {row.category?.name}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', header: 'Price', className: 'tabular-nums', render: (row) => money(row.salePrice > 0 ? row.salePrice : row.regularPrice) },
    { key: 'current', header: 'Current', sortKey: 'stockQuantity', render: (row) => <StockCell product={row} /> },
    { key: 'alert', header: 'Alert at', className: 'tabular-nums text-slate-500', render: (row) => (row.manageStock ? number(row.lowStockThreshold) : '—') },
    { key: 'status', header: 'Stock status', render: (row) => <StatusBadge status={row.manageStock && row.stockQuantity > 0 && row.stockQuantity <= row.lowStockThreshold ? 'low_stock' : row.stockStatus} /> },
    { key: 'edit', header: 'Update stock', render: (row) => <StockEditor key={`${row.id}-${row.stockQuantity}`} product={row} onSaved={replace} /> },
  ];

  return (
    <>
      <PageHeader title={config?.title ?? 'Stock Management'} description={config?.description ?? 'Adjust stock levels inline. Press Enter or Save to apply a new quantity.'} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Search name or SKU…" className="w-full sm:w-72" />
          <FilterDropdown label="Category" value={params.category ?? ''} onChange={(category) => update({ category })} options={(categories?.items ?? []).map((item) => ({ value: item.id, label: item.name }))} />
          {!config && <FilterDropdown label="Stock" value={params.stock ?? ''} onChange={(stock) => update({ stock })} options={[{ value: 'in_stock', label: 'In stock' }, { value: 'low', label: 'Low stock' }, { value: 'out_of_stock', label: 'Out of stock' }, { value: 'backorder', label: 'Backorder' }]} />}
        </div>
        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          error={error}
          onRetry={reload}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }}
          skeleton={<ProductTableSkeleton />}
          empty={<EmptyState icon={config ? PackageX : Package} title={config ? 'Nothing to restock' : 'No products found'} message={config ? 'Every tracked product is above its stock alert. Nice!' : 'Try a different search.'} />}
        />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>
    </>
  );
}
