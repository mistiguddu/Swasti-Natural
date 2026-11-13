import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Eye, FolderInput, ImageIcon, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton, LinkButton } from '../../components/ui/Button.jsx';
import DataTable, { BulkBar, Thumb } from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import { SelectInput, Toggle } from '../../components/ui/Form.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal, Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState.jsx';
import { ProductTableSkeleton, Skeleton } from '../../components/ui/Skeleton.jsx';
import { date, money, number } from '../../lib/format.js';

const PRESETS = {
  featured: { title: 'Featured Products', description: 'Products highlighted on your storefront.', filter: { featured: 'true' } },
  newArrival: { title: 'New Arrivals', description: 'Products marked as new arrivals.', filter: { newArrival: 'true' } },
  bestSelling: { title: 'Best Selling', description: 'Products flagged as best sellers, ranked by units sold.', filter: { bestSelling: 'true' }, sort: { sortBy: 'soldCount', sortOrder: 'desc' } },
};

export function StockCell({ product }) {
  if (!product.manageStock) return <StatusBadge status={product.stockStatus} />;
  const low = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
  const tone = product.stockQuantity <= 0 ? 'text-rose-600' : low ? 'text-orange-600' : 'text-slate-800';
  return (
    <div className="leading-tight">
      <span className={`font-semibold tabular-nums ${tone}`}>{number(product.stockQuantity)}</span>
      <span className="block text-[11px] text-slate-400">{product.stockQuantity <= 0 ? (product.allowBackorders ? 'Backorder' : 'Out of stock') : low ? 'Low stock' : 'In stock'}</span>
    </div>
  );
}

function CategoryBanner({ category, loading, subcategory, onSubcategory }) {
  if (loading && !category) {
    return <Card className="mb-6 flex items-center gap-4 p-5"><Skeleton className="h-16 w-16 rounded-xl" /><div className="flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="mt-2 h-3 w-32" /></div></Card>;
  }
  if (!category) return null;
  return (
    <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
      <Thumb src={category.thumbnail || category.image} alt={category.name} size="h-16 w-16" rounded="rounded-xl" icon={ImageIcon} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900">{category.name}</h2>
          <StatusBadge status={category.status} />
        </div>
        <p className="text-sm text-slate-500"><strong className="text-slate-800">{number(category.productCount)}</strong> products · code {category.code}</p>
      </div>
      {category.subcategories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Subcategory">
          {[{ id: '', name: 'All' }, ...category.subcategories].map((sub) => (
            <button key={sub.id || 'all'} type="button" role="radio" aria-checked={subcategory === sub.id} onClick={() => onSubcategory(sub.id)} className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold transition ${subcategory === sub.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{sub.name}</button>
          ))}
        </div>
      )}
      <Link to={`/categories/${category.id}`} className="text-xs font-semibold text-teal-700 hover:underline">Category details</Link>
    </Card>
  );
}

export default function ProductListPage({ preset }) {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const config = PRESETS[preset];
  const { params, update, toggleSort, key } = useListParams(config?.sort ?? {});
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);
  const [move, setMove] = useState(null);
  const [busy, setBusy] = useState(false);

  const query = { ...params, ...(config?.filter ?? {}) };
  const { data, loading, error, reload, setData } = useApi(
    () => (categoryId ? api.get(`/categories/${categoryId}/products`, query) : api.get('/products', query)),
    [key, categoryId, preset],
  );
  const { data: categories } = useApi(() => api.get('/categories', { all: 'true' }), []);
  const category = data?.category;

  const patchRow = (id, changes) => setData((current) => ({ ...current, items: current.items.map((row) => (row.id === id ? { ...row, ...changes } : row)) }));

  async function toggle(row, field, value) {
    patchRow(row.id, { [field]: value });
    try {
      if (field === 'status') await api.patch(`/products/${row.id}/status`, { status: value });
      else await api.patch(`/products/${row.id}/featured`, { isFeatured: value });
    } catch (requestError) {
      patchRow(row.id, { [field]: row[field] });
      toast.error(requestError.message);
    }
  }

  async function duplicate(row) {
    try {
      const copy = await api.post(`/products/${row.id}/duplicate`);
      toast.success(`Duplicated as draft “${copy.name}”`);
      navigate(`/products/${copy.id}/edit`);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  async function runConfirmed() {
    setBusy(true);
    try {
      if (confirm.type === 'delete') {
        await api.delete(`/products/${confirm.row.id}`);
        toast.success(`“${confirm.row.name}” deleted`);
      } else {
        const result = await api.post('/products/bulk-delete', { ids: [...selected] });
        toast.success(`${result.deleted} product(s) deleted`);
        setSelected(new Set());
      }
      setConfirm(null);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function bulkStatus(status) {
    try {
      const result = await api.patch('/products/bulk-status', { ids: [...selected], status });
      toast.success(`${result.updated} product(s) set to ${status}`);
      setSelected(new Set());
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  async function moveProducts() {
    setBusy(true);
    try {
      const result = await api.patch('/products/bulk-category', { ids: [...selected], category: move.category, subcategory: move.subcategory || null });
      toast.success(`${result.updated} product(s) moved`);
      setSelected(new Set());
      setMove(null);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const pagination = data?.pagination;
  const startIndex = pagination ? (pagination.page - 1) * pagination.limit : 0;
  const filterKeys = ['search', 'status', 'stock', 'minPrice', 'maxPrice', 'subcategory', ...(categoryId ? [] : ['category'])];
  const filtered = filterKeys.some((name) => params[name]);
  const clear = () => update(Object.fromEntries(filterKeys.map((name) => [name, ''])));
  const allCategories = categories?.items ?? [];
  const addLink = `/products/new${categoryId ? `?category=${category?.parent ? category.parent.id ?? category.parent : categoryId}${category?.parent ? `&subcategory=${categoryId}` : ''}` : ''}`;

  const columns = [
    { key: 'sl', header: 'SL', className: 'w-12 text-xs text-slate-400 tabular-nums', render: (_, index) => index + 1 },
    { key: 'image', header: 'Image', render: (row) => <Thumb src={row.thumbnail || row.image} alt={row.name} icon={Package} /> },
    {
      key: 'name', header: 'Product Name', sortKey: 'name', render: (row) => (
        <div className="min-w-48">
          <Link to={`/products/${row.id}`} className="line-clamp-2 font-semibold text-slate-900 hover:text-teal-700">{row.name}</Link>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {row.isNewArrival && <span className="rounded bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-700">NEW</span>}
            {row.isBestSelling && <span className="rounded bg-violet-50 px-1.5 text-[10px] font-semibold text-violet-700">BEST SELLER</span>}
            {row.brand && <span className="text-[11px] text-slate-400">{row.brand}</span>}
          </div>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', sortKey: 'sku', className: 'whitespace-nowrap', render: (row) => <code className="text-xs text-slate-600">{row.sku}</code> },
    {
      key: 'category', header: 'Category', render: (row) => (
        <div className="text-xs leading-tight">
          {row.category ? <Link to={`/categories/${row.category.id}/products`} className="font-medium text-slate-700 hover:text-teal-700">{row.category.name}</Link> : '—'}
          {row.subcategory && <span className="block text-slate-400">{row.subcategory.name}</span>}
        </div>
      ),
    },
    { key: 'regularPrice', header: 'Regular', sortKey: 'regularPrice', className: 'tabular-nums whitespace-nowrap', render: (row) => <span className={row.salePrice > 0 ? 'text-slate-400 line-through' : 'font-semibold text-slate-900'}>{money(row.regularPrice)}</span> },
    {
      key: 'salePrice', header: 'Sale', sortKey: 'salePrice', className: 'tabular-nums whitespace-nowrap', render: (row) => (row.salePrice > 0 ? (
        <span><span className="font-semibold text-slate-900">{money(row.salePrice)}</span> <span className="text-[11px] font-semibold text-emerald-600">−{Math.round(row.discountPercentage)}%</span></span>
      ) : <span className="text-slate-300">—</span>),
    },
    { key: 'stock', header: 'Stock', sortKey: 'stockQuantity', render: (row) => <StockCell product={row} /> },
    { key: 'featured', header: 'Featured', render: (row) => <Toggle size="sm" checked={row.isFeatured} onChange={(value) => toggle(row, 'isFeatured', value)} /> },
    {
      key: 'status', header: 'Status', render: (row) => (
        <select value={row.status} onChange={(event) => toggle(row, 'status', event.target.value)} aria-label={`Status of ${row.name}`} className={`h-7 cursor-pointer rounded-full border-0 px-2.5 text-xs font-semibold ring-1 ring-inset outline-none ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : row.status === 'draft' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
          <option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option>
        </select>
      ),
    },
    { key: 'createdAt', header: 'Created', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => date(row.createdAt) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Eye} label={`View ${row.name}`} variant="teal" onClick={() => navigate(`/products/${row.id}`)} />
          <IconButton icon={Pencil} label={`Edit ${row.name}`} variant="teal" onClick={() => navigate(`/products/${row.id}/edit`)} />
          <IconButton icon={Copy} label={`Duplicate ${row.name}`} variant="teal" onClick={() => duplicate(row)} />
          <IconButton icon={Trash2} label={`Delete ${row.name}`} variant="danger" onClick={() => setConfirm({ type: 'delete', row })} />
        </div>
      ),
    },
  ];

  const title = categoryId ? (category ? `${category.name} products` : 'Category products') : config?.title ?? 'All Products';
  const breadcrumb = categoryId
    ? [{ label: 'Products' }, { label: 'Categories', to: '/categories' }, { label: category?.name ?? '…', to: `/categories/${categoryId}` }, { label: 'Products' }]
    : undefined;
  const subcategoryOptions = (moveCategory) => allCategories.filter((item) => (item.parent?.id ?? item.parent) === moveCategory).map((item) => ({ value: item.id, label: item.name }));

  if (categoryId && error?.status === 404) return <><PageHeader breadcrumb={breadcrumb} title="Category not found" /><Card><ErrorState error={error} /></Card></>;

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        description={categoryId ? 'All products in this category and its subcategories.' : config?.description ?? 'Manage your full product catalogue.'}
        actions={<LinkButton to={addLink} icon={Plus}>{categoryId ? 'Add product to category' : 'Add Product'}</LinkButton>}
      />
      {categoryId && <CategoryBanner category={category} loading={loading} subcategory={params.subcategory ?? ''} onSubcategory={(subcategory) => update({ subcategory })} />}
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder={categoryId ? 'Search in this category…' : 'Search name, SKU, brand, tag…'} className="w-full sm:w-72" />
          {!categoryId && <FilterDropdown label="Category" value={params.category ?? ''} onChange={(value) => update({ category: value })} options={allCategories.map((item) => ({ value: item.id, label: item.parent ? `— ${item.name}` : item.name }))} />}
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'draft', label: 'Draft' }]} />
          <FilterDropdown label="Stock" value={params.stock ?? ''} onChange={(stock) => update({ stock })} options={[{ value: 'in_stock', label: 'In stock' }, { value: 'low', label: 'Low stock' }, { value: 'out_of_stock', label: 'Out of stock' }, { value: 'backorder', label: 'Backorder' }]} />
          <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-sm">
            <span className="pl-1 text-xs font-medium text-slate-500">Price:</span>
            <input type="number" min="0" inputMode="decimal" aria-label="Minimum price" placeholder="Min" defaultValue={params.minPrice ?? ''} onBlur={(event) => update({ minPrice: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && update({ minPrice: event.currentTarget.value })} className="w-16 bg-transparent px-1 outline-none" />
            <span className="text-slate-300">–</span>
            <input type="number" min="0" inputMode="decimal" aria-label="Maximum price" placeholder="Max" defaultValue={params.maxPrice ?? ''} onBlur={(event) => update({ maxPrice: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && update({ maxPrice: event.currentTarget.value })} className="w-16 bg-transparent px-1 outline-none" />
          </div>
          {filtered && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('active')}>Set active</Button>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('inactive')}>Set inactive</Button>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('draft')}>Set draft</Button>
          <Button size="sm" variant="secondary" icon={FolderInput} onClick={() => setMove({ category: '', subcategory: '' })}>Change category</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({ type: 'bulk' })}>Delete</Button>
        </BulkBar>
        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          error={error}
          onRetry={reload}
          startIndex={startIndex}
          selection={{ selected, onChange: setSelected }}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }}
          skeleton={<ProductTableSkeleton />}
          empty={(
            <EmptyState
              icon={Package}
              title={filtered ? 'No products match your filters' : categoryId ? 'No products in this category yet' : config ? `No ${config.title.toLowerCase()} yet` : 'No products yet'}
              message={filtered ? 'Try a different search or clear the filters.' : config ? 'Turn on the matching option when editing a product.' : 'Add your first product to start selling.'}
              action={filtered ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : <LinkButton to={addLink} icon={Plus}>Add Product</LinkButton>}
            />
          )}
        />
        <Pagination pagination={pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>

      <ConfirmationModal
        open={Boolean(confirm)}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmed}
        title={confirm?.type === 'delete' ? `Delete “${confirm.row.name}”?` : `Delete ${selected.size} product(s)?`}
        message="Reviews for these products are removed too. Past orders keep their item details. This can’t be undone."
      />
      <Modal
        open={Boolean(move)}
        onClose={() => setMove(null)}
        title={`Change category for ${selected.size} product(s)`}
        footer={<><Button variant="secondary" onClick={() => setMove(null)}>Cancel</Button><Button disabled={!move?.category} busy={busy} busyLabel="Moving…" onClick={moveProducts}>Move products</Button></>}
      >
        <div className="space-y-4">
          <SelectInput label="New category" required value={move?.category ?? ''} onChange={(event) => setMove({ category: event.target.value, subcategory: '' })} placeholder="Choose a category" options={allCategories.filter((item) => !item.parent).map((item) => ({ value: item.id, label: item.name }))} />
          <SelectInput label="Subcategory" value={move?.subcategory ?? ''} onChange={(event) => setMove((current) => ({ ...current, subcategory: event.target.value }))} placeholder="None" options={move?.category ? subcategoryOptions(move.category) : []} disabled={!move?.category} />
        </div>
      </Modal>
    </>
  );
}
