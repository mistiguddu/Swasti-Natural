import { Link, useNavigate } from 'react-router-dom';
import { CircleDollarSign, CreditCard, Download, RotateCcw, XCircle } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { DateRangeFilter, FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { DashboardCardSkeleton, OrderTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { dateTime, money, number, PAYMENT_METHOD_LABELS, PAYMENT_STATUSES, titleCase } from '../../lib/format.js';
import { downloadCsv } from '../../lib/csv.js';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { params, update, toggleSort, key } = useListParams();
  const { data, loading, error, reload } = useApi(() => api.get('/orders', params), [key]);
  const summary = data?.paymentSummary;

  const columns = [
    { key: 'orderNumber', header: 'Order', sortKey: 'orderNumber', render: (row) => <Link to={`/orders/${row.id}`} className="font-semibold text-teal-700 hover:underline">{row.orderNumber}</Link> },
    { key: 'customer', header: 'Customer', render: (row) => row.customerInfo?.name },
    { key: 'method', header: 'Method', render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
    { key: 'transactionId', header: 'Transaction ID', render: (row) => (row.transactionId ? <code className="text-xs">{row.transactionId}</code> : <span className="text-slate-300">—</span>) },
    { key: 'grandTotal', header: 'Amount', sortKey: 'grandTotal', className: 'font-semibold tabular-nums', render: (row) => money(row.grandTotal) },
    { key: 'paymentStatus', header: 'Payment', sortKey: 'paymentStatus', render: (row) => <StatusBadge status={row.paymentStatus} /> },
    { key: 'status', header: 'Order status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Date', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => dateTime(row.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payment status for every order. Open an order to record a payment or refund."
        actions={<Button variant="secondary" icon={Download} disabled={!data?.items?.length} onClick={() => downloadCsv('payments', [
          { key: 'orderNumber', label: 'Order' }, { label: 'Customer', value: (row) => row.customerInfo?.name }, { key: 'paymentMethod', label: 'Method' },
          { key: 'transactionId', label: 'Transaction ID' }, { key: 'grandTotal', label: 'Amount' }, { key: 'paymentStatus', label: 'Payment status' },
          { label: 'Date', value: (row) => new Date(row.createdAt).toISOString() },
        ], data.items)}>Export page</Button>}
      />
      <div className="space-y-6">
        {loading && !data ? <DashboardCardSkeleton /> : summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Paid" value={money(summary.paid.amount)} icon={CircleDollarSign} accent="emerald" footnote={`${number(summary.paid.count)} payments`} />
            <StatCard title="Pending" value={money(summary.pending.amount)} icon={CreditCard} accent="amber" footnote={`${number(summary.pending.count)} awaiting payment`} />
            <StatCard title="Failed" value={money(summary.failed.amount)} icon={XCircle} accent="rose" footnote={`${number(summary.failed.count)} failed`} />
            <StatCard title="Refunded" value={money(summary.refunded.amount)} icon={RotateCcw} accent="slate" footnote={`${number(summary.refunded.count)} refunds`} />
          </div>
        )}
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
            <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Order #, customer or transaction ID…" className="w-full sm:w-80" />
            <FilterDropdown label="Payment" value={params.paymentStatus ?? ''} onChange={(value) => update({ paymentStatus: value })} options={PAYMENT_STATUSES.map((value) => ({ value, label: titleCase(value) }))} />
            <FilterDropdown label="Method" value={params.paymentMethod ?? ''} onChange={(value) => update({ paymentMethod: value })} options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
            <DateRangeFilter className="w-full xl:ml-auto xl:w-auto" value={{ range: params.range ?? '', from: params.from ?? '', to: params.to ?? '' }} onChange={(value) => update(value)} />
          </div>
          <DataTable columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload} onRowClick={(row) => navigate(`/orders/${row.id}`)} sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }} skeleton={<OrderTableSkeleton />} empty={<EmptyState icon={CreditCard} title="No payments found" />} />
          <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
        </Card>
      </div>
    </>
  );
}
