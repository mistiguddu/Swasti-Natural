import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, UserPlus, Users } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton, LinkButton } from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import { Toggle } from '../../components/ui/Form.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { CustomerTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { date, money, number } from '../../lib/format.js';
import { downloadCsv } from '../../lib/csv.js';
import { t } from '../../i18n/index.js';

export function Avatar({ name, size = 'h-9 w-9 text-sm' }) {
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-accent2-400 font-display font-bold text-white ${size}`}>{(name ?? '?').trim().charAt(0).toUpperCase()}</span>;
}

export default function CustomerListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { params, update, toggleSort, key } = useListParams();
  const { data, loading, error, reload, setData } = useApi(() => api.get('/customers', params), [key]);

  async function setActive(row, isActive) {
    setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, isActive } : item)) }));
    try {
      await api.patch(`/users/${row.id}/status`, { isActive });
      toast.success(`${row.name} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (requestError) {
      setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, isActive: row.isActive } : item)) }));
      toast.error(requestError.message);
    }
  }

  const columns = [
    {
      key: 'name', header: 'Customer', sortKey: 'name', render: (row) => (
        <div className="flex min-w-48 items-center gap-3">
          <Avatar name={row.name} />
          <div className="min-w-0 leading-tight">
            <Link to={`/customers/${row.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{row.name}</Link>
            <p className="truncate text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || <span className="text-slate-300">—</span> },
    { key: 'address', header: 'Address', render: (row) => <span className="block max-w-48 truncate text-xs text-slate-500">{[row.address?.city, row.address?.country].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'totalOrders', header: 'Orders', sortKey: 'totalOrders', className: 'tabular-nums', render: (row) => number(row.totalOrders) },
    { key: 'totalSpent', header: 'Total spent', sortKey: 'totalSpent', className: 'font-semibold tabular-nums whitespace-nowrap', render: (row) => money(row.totalSpent) },
    { key: 'createdAt', header: 'Registered', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => date(row.createdAt) },
    { key: 'status', header: 'Status', render: (row) => <Toggle size="sm" checked={row.isActive} onChange={(value) => setActive(row, value)} label={<span className="text-xs font-medium">{t(row.isActive ? 'Active' : 'Inactive')}</span>} /> },
    { key: 'actions', header: <span className="sr-only">{t('Actions')}</span>, className: 'text-right', render: (row) => <IconButton icon={Eye} variant="teal" label={`View ${row.name}`} onClick={() => navigate(`/customers/${row.id}`)} /> },
  ];

  return (
    <>
      <PageHeader
        title="Customer List"
        description="Everyone who shops with you, with lifetime orders and spending."
        actions={(
          <>
            <Button variant="secondary" icon={Download} disabled={!data?.items?.length} onClick={() => downloadCsv('customers', [
              { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'totalOrders', label: 'Orders' },
              { key: 'totalSpent', label: 'Total spent' }, { label: 'Status', value: (row) => (row.isActive ? 'active' : 'inactive') }, { label: 'Registered', value: (row) => new Date(row.createdAt).toISOString() },
            ], data.items)}>{t('Export page')}</Button>
            <LinkButton to="/users/new?role=user" icon={UserPlus}>{t('Add customer')}</LinkButton>
          </>
        )}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Search name, email or phone…" className="w-full sm:w-80" />
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <FilterDropdown
            label="Sort" allLabel="Newest" value={params.sortBy === 'createdAt' && params.sortOrder === 'desc' ? '' : `${params.sortBy}:${params.sortOrder}`}
            onChange={(value) => { const [sortBy, sortOrder] = (value || 'createdAt:desc').split(':'); update({ sortBy, sortOrder }); }}
            options={[{ value: 'totalSpent:desc', label: 'Top spenders' }, { value: 'totalOrders:desc', label: 'Most orders' }, { value: 'lastOrderAt:desc', label: 'Recent buyers' }, { value: 'name:asc', label: 'Name A–Z' }, { value: 'createdAt:asc', label: 'Oldest' }]}
          />
        </div>
        <DataTable
          columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }}
          skeleton={<CustomerTableSkeleton />}
          empty={<EmptyState icon={Users} title={params.search || params.status ? 'No customers match' : 'No customers yet'} message="Customers appear here when they register or when you add them." action={<LinkButton variant="secondary" to="/users/new?role=user" icon={UserPlus}>{t('Add customer')}</LinkButton>} />}
        />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>
    </>
  );
}
