import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Download, Eye, Plus, ShoppingCart } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton, LinkButton } from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { DateRangeFilter, FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OrderTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { dateTime, money, ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_STATUSES, titleCase } from '../../lib/format.js';
import { downloadCsv } from '../../lib/csv.js';

export default function OrderListPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const { params, update, toggleSort, key } = useListParams();
  const query = { ...params, ...(status ? { status } : {}) };
  const { data, loading, error, reload } = useApi(() => api.get('/orders', query), [key, status]);
  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const filterKeys = ['search', 'paymentStatus', 'paymentMethod', 'range', 'from', 'to'];
  const filtered = filterKeys.some((name) => params[name]);

  const columns = [
    { key: 'orderNumber', header: 'Order', sortKey: 'orderNumber', render: (row) => <Link to={`/orders/${row.id}`} className="font-semibold whitespace-nowrap text-teal-700 hover:underline">{row.orderNumber}</Link> },
    { key: 'customer', header: 'Customer', render: (row) => <div className="min-w-40 leading-tight"><span className="block font-medium text-slate-800">{row.customerInfo?.name}</span><span className="text-xs text-slate-400">{row.customerInfo?.email}</span></div> },
    { key: 'items', header: 'Items', className: 'tabular-nums', render: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0) },
    { key: 'grandTotal', header: 'Total', sortKey: 'grandTotal', className: 'font-semibold whitespace-nowrap text-slate-900 tabular-nums', render: (row) => money(row.grandTotal) },
    { key: 'payment', header: 'Payment', render: (row) => <div className="space-y-1"><StatusBadge status={row.paymentStatus} /><span className="block text-[11px] text-slate-400">{PAYMENT_METHOD_LABELS[row.paymentMethod]}</span></div> },
    { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Date', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => dateTime(row.createdAt) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', render: (row) => <IconButton icon={Eye} label={`View ${row.orderNumber}`} variant="teal" onClick={() => navigate(`/orders/${row.id}`)} /> },
  ];

  const exportCsv = () => downloadCsv(`orders-${status ?? 'all'}`, [
    { key: 'orderNumber', label: 'Order' },
    { label: 'Customer', value: (row) => row.customerInfo?.name },
    { label: 'Email', value: (row) => row.customerInfo?.email },
    { label: 'Items', value: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0) },
    { key: 'subtotal', label: 'Subtotal' }, { key: 'discount', label: 'Discount' }, { key: 'shippingCharge', label: 'Shipping' }, { key: 'tax', label: 'Tax' }, { key: 'grandTotal', label: 'Total' },
    { key: 'paymentMethod', label: 'Payment method' }, { key: 'paymentStatus', label: 'Payment status' }, { key: 'status', label: 'Status' },
    { label: 'Date', value: (row) => new Date(row.createdAt).toISOString() },
  ], data?.items ?? []);

  return (
    <>
      <PageHeader
        title={status ? `${titleCase(status)} Orders` : 'All Orders'}
        description="Track, update and fulfil customer orders."
        actions={(
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!data?.items?.length}>Export page</Button>
            <LinkButton to="/orders/new" icon={Plus}>Create order</LinkButton>
          </>
        )}
      />
      <Card>
        <nav aria-label="Order status" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3 [scrollbar-width:none]">
          {[{ key: '', label: 'All', count: total }, ...ORDER_STATUSES.map((value) => ({ key: value, label: titleCase(value), count: counts[value] ?? 0 }))].map((tab) => (
            <NavLink key={tab.key || 'all'} to={tab.key ? `/orders/status/${tab.key}` : '/orders'} end className={({ isActive }) => `-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {tab.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600 tabular-nums">{tab.count}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Order #, customer, phone, transaction…" className="w-full sm:w-80" />
          <FilterDropdown label="Payment" value={params.paymentStatus ?? ''} onChange={(value) => update({ paymentStatus: value })} options={PAYMENT_STATUSES.map((value) => ({ value, label: titleCase(value) }))} />
          <FilterDropdown label="Method" value={params.paymentMethod ?? ''} onChange={(value) => update({ paymentMethod: value })} options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
          {filtered && <Button variant="ghost" size="sm" onClick={() => update(Object.fromEntries(filterKeys.map((name) => [name, ''])))}>Clear filters</Button>}
          <DateRangeFilter className="w-full xl:ml-auto xl:w-auto" value={{ range: params.range ?? '', from: params.from ?? '', to: params.to ?? '' }} onChange={(value) => update(value)} />
        </div>
        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(row) => navigate(`/orders/${row.id}`)}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }}
          skeleton={<OrderTableSkeleton />}
          empty={<EmptyState icon={ShoppingCart} title={filtered || status ? 'No orders match' : 'No orders yet'} message={filtered ? 'Try different filters.' : 'New orders will appear here.'} action={<LinkButton variant="secondary" to="/orders/new" icon={Plus}>Create order</LinkButton>} />}
        />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>
    </>
  );
}
