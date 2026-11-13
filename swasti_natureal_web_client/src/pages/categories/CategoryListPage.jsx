import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, FolderTree, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton, LinkButton } from '../../components/ui/Button.jsx';
import DataTable, { BulkBar, Thumb } from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import { Toggle } from '../../components/ui/Form.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { CategoryTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { date } from '../../lib/format.js';

export default function CategoryListPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { refreshCategories } = useOutletContext() ?? {};
  const { params, update, toggleSort, key } = useListParams();
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload, setData } = useApi(() => api.get('/categories', params), [key]);
  const { data: parents } = useApi(() => api.get('/categories', { all: 'true' }), []);

  const patchRow = (id, changes) => setData((current) => ({ ...current, items: current.items.map((row) => (row.id === id ? { ...row, ...changes } : row)) }));

  async function toggleField(row, field, value) {
    patchRow(row.id, { [field]: value });
    try {
      if (field === 'status') await api.patch(`/categories/${row.id}/status`, { status: value });
      else await api.patch(`/categories/${row.id}/featured`, { isFeatured: value });
      refreshCategories?.();
    } catch (requestError) {
      patchRow(row.id, { [field]: row[field] });
      toast.error(requestError.message);
    }
  }

  async function runConfirmed() {
    setBusy(true);
    try {
      if (confirm.type === 'delete') {
        await api.delete(`/categories/${confirm.row.id}`);
        toast.success(`“${confirm.row.name}” deleted`);
      } else if (confirm.type === 'bulk-delete') {
        const result = await api.post('/categories/bulk-delete', { ids: [...selected] });
        if (result.deleted) toast.success(`${result.deleted} categor${result.deleted === 1 ? 'y' : 'ies'} deleted`);
        result.skipped.forEach((item) => toast.error(item.reason));
      }
      setSelected(new Set());
      setConfirm(null);
      reload();
      refreshCategories?.();
    } catch (requestError) {
      toast.error(requestError.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  async function bulkStatus(status) {
    try {
      const result = await api.patch('/categories/bulk-status', { ids: [...selected], status });
      toast.success(`${result.updated} categor${result.updated === 1 ? 'y' : 'ies'} set to ${status}`);
      setSelected(new Set());
      reload();
      refreshCategories?.();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  const pagination = data?.pagination;
  const startIndex = pagination ? (pagination.page - 1) * pagination.limit : 0;
  const filtered = params.search || params.status || params.parent;

  const columns = [
    { key: 'sl', header: 'SL', className: 'w-12 text-xs text-slate-400 tabular-nums', render: (_, index) => index + 1 },
    { key: 'image', header: 'Image', render: (row) => <Thumb src={row.image} alt={row.name} icon={ImageIcon} /> },
    { key: 'thumbnail', header: 'Thumb', render: (row) => <Thumb src={row.thumbnail} alt="" size="h-9 w-9" icon={ImageIcon} /> },
    {
      key: 'name', header: 'Category Name', sortKey: 'name', render: (row) => (
        <div className="min-w-40">
          <Link to={`/categories/${row.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{row.name}</Link>
          <p className="text-xs text-slate-400">/{row.slug}{row.childCount ? ` · ${row.childCount} sub` : ''}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Code', sortKey: 'code', className: 'whitespace-nowrap', render: (row) => <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{row.code}</code> },
    { key: 'parent', header: 'Parent', render: (row) => (row.parent ? <Link to={`/categories/${row.parent.id}`} className="text-slate-600 hover:text-teal-700">{row.parent.name}</Link> : <span className="text-xs whitespace-nowrap text-slate-400">Top level</span>) },
    {
      key: 'products', header: 'Products', className: 'text-center', headerClassName: 'text-center', render: (row) => (
        <Link to={`/categories/${row.id}/products`} title="View products in this category" className="inline-flex min-w-9 justify-center rounded-lg bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100 hover:bg-teal-100">{row.productCount}</Link>
      ),
    },
    { key: 'featured', header: 'Featured', render: (row) => <Toggle size="sm" checked={row.isFeatured} onChange={(value) => toggleField(row, 'isFeatured', value)} /> },
    {
      key: 'status', header: 'Status', render: (row) => (
        <div className="flex items-center gap-2">
          <Toggle size="sm" checked={row.status === 'active'} onChange={(value) => toggleField(row, 'status', value ? 'active' : 'inactive')} />
          <StatusBadge status={row.status} />
        </div>
      ),
    },
    { key: 'createdAt', header: 'Created', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => date(row.createdAt) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Eye} label={`View ${row.name}`} variant="teal" onClick={() => navigate(`/categories/${row.id}`)} />
          <IconButton icon={Pencil} label={`Edit ${row.name}`} variant="teal" onClick={() => navigate(`/categories/${row.id}/edit`)} />
          <IconButton icon={Trash2} label={`Delete ${row.name}`} variant="danger" onClick={() => setConfirm({ type: 'delete', row })} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Product Categories"
        description="Organise your catalogue into categories and subcategories."
        actions={<LinkButton to="/categories/new" icon={Plus}>Add Category</LinkButton>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Search by name or code…" className="w-full sm:w-72" />
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <FilterDropdown
            label="Parent"
            value={params.parent ?? ''}
            onChange={(parent) => update({ parent })}
            options={[{ value: 'root', label: 'Top level only' }, ...(parents?.items ?? []).map((item) => ({ value: item.id, label: item.name }))]}
          />
          <FilterDropdown
            label="Sort"
            allLabel="Newest first"
            value={params.sortBy === 'createdAt' && params.sortOrder === 'desc' ? '' : `${params.sortBy}:${params.sortOrder}`}
            onChange={(value) => { const [sortBy, sortOrder] = (value || 'createdAt:desc').split(':'); update({ sortBy, sortOrder }); }}
            options={[{ value: 'createdAt:asc', label: 'Oldest first' }, { value: 'name:asc', label: 'Name A–Z' }, { value: 'name:desc', label: 'Name Z–A' }, { value: 'displayOrder:asc', label: 'Display order' }]}
          />
          {filtered && <Button variant="ghost" size="sm" onClick={() => update({ search: '', status: '', parent: '' })}>Clear filters</Button>}
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('active')}>Set active</Button>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('inactive')}>Set inactive</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({ type: 'bulk-delete' })}>Delete</Button>
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
          skeleton={<CategoryTableSkeleton rows={Number(params.limit) > 10 ? 12 : 8} />}
          empty={(
            <EmptyState
              icon={FolderTree}
              title={filtered ? 'No categories match your filters' : 'No categories yet'}
              message={filtered ? 'Try a different search or clear the filters.' : 'Create your first category to start organising products.'}
              action={filtered ? <Button variant="secondary" onClick={() => update({ search: '', status: '', parent: '' })}>Clear filters</Button> : <LinkButton to="/categories/new" icon={Plus}>Add Category</LinkButton>}
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
        title={confirm?.type === 'bulk-delete' ? `Delete ${selected.size} categories?` : `Delete “${confirm?.row?.name}”?`}
        message="Categories that still contain products or subcategories are kept. Their images are removed when nothing else uses them. This can’t be undone."
      />
    </>
  );
}
