import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageSquareReply, Package, Star, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { useApi, useListParams } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { Card, PageHeader } from '../components/ui/Card.jsx';
import { Button, IconButton } from '../components/ui/Button.jsx';
import DataTable, { BulkBar, Thumb } from '../components/ui/DataTable.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../components/ui/Controls.jsx';
import { TextArea } from '../components/ui/Form.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { ConfirmationModal, Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { date } from '../lib/format.js';
import { t } from '../i18n/index.js';

function Stars({ value }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className={star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}
    </span>
  );
}

export default function ReviewsPage() {
  const toast = useToast();
  const { params, update, toggleSort, key } = useListParams();
  const { data, loading, error, reload } = useApi(() => api.get('/reviews', params), [key]);
  const [selected, setSelected] = useState(new Set());
  const [reply, setReply] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const counts = data?.counts ?? {};

  async function moderate(row, changes, message) {
    try {
      await api.patch(`/reviews/${row.id}`, changes);
      toast.success(message);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  async function bulk(status) {
    try {
      const result = await api.patch('/reviews/bulk-status', { ids: [...selected], status });
      toast.success(`${result.updated} review(s) ${status}`);
      setSelected(new Set());
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  async function runConfirmed() {
    setBusy(true);
    try {
      if (confirm.row) await api.delete(`/reviews/${confirm.row.id}`);
      else await api.post('/reviews/bulk-delete', { ids: [...selected] });
      toast.success('Deleted');
      setSelected(new Set());
      setConfirm(null);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReply() {
    setBusy(true);
    await moderate(reply.row, { adminReply: reply.text }, 'Reply saved');
    setBusy(false);
    setReply(null);
  }

  const columns = [
    {
      key: 'product', header: 'Product', render: (row) => (
        <div className="flex min-w-44 items-center gap-2.5">
          <Thumb src={row.product?.thumbnail || row.product?.image} size="h-9 w-9" icon={Package} />
          {row.product ? <Link to={`/products/${row.product.id}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-teal-700">{row.product.name}</Link> : <span className="text-slate-400">{t('Deleted product')}</span>}
        </div>
      ),
    },
    { key: 'customer', header: 'Customer', render: (row) => <div className="leading-tight"><span className="block text-sm text-slate-800">{row.customer?.name ?? 'Deleted user'}</span><span className="text-xs text-slate-400">{row.customer?.email}</span></div> },
    { key: 'rating', header: 'Rating', sortKey: 'rating', render: (row) => <Stars value={row.rating} /> },
    {
      key: 'review', header: 'Review', render: (row) => (
        <div className="max-w-sm">
          {row.title && <p className="text-sm font-semibold text-slate-800">{row.title}</p>}
          <p className="line-clamp-2 text-sm text-slate-600">{row.comment || <span className="text-slate-400">{t('No comment')}</span>}</p>
          {row.adminReply && <p className="mt-1 line-clamp-1 text-xs text-teal-700">↳ {row.adminReply}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Date', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => date(row.createdAt) },
    {
      key: 'actions', header: <span className="sr-only">{t('Actions')}</span>, className: 'text-right', render: (row) => (
        <div className="flex justify-end gap-0.5">
          {row.status !== 'approved' && <IconButton icon={Check} variant="teal" label="Approve" onClick={() => moderate(row, { status: 'approved' }, 'Review approved')} />}
          {row.status !== 'rejected' && <IconButton icon={X} variant="danger" label="Reject" onClick={() => moderate(row, { status: 'rejected' }, 'Review rejected')} />}
          <IconButton icon={MessageSquareReply} variant="teal" label="Reply" onClick={() => setReply({ row, text: row.adminReply ?? '' })} />
          <IconButton icon={Trash2} variant="danger" label="Delete" onClick={() => setConfirm({ row })} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Reviews & Ratings" description="Moderate customer reviews. Only approved reviews count toward product ratings." />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Search review, product or customer…" className="w-full sm:w-80" />
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={['pending', 'approved', 'rejected'].map((value) => ({ value, label: `${value[0].toUpperCase()}${value.slice(1)} (${counts[value] ?? 0})` }))} />
          <FilterDropdown label="Rating" value={params.rating ?? ''} onChange={(rating) => update({ rating })} options={[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value > 1 ? 's' : ''}` }))} />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" icon={Check} onClick={() => bulk('approved')}>{t('Approve')}</Button>
          <Button size="sm" variant="secondary" icon={X} onClick={() => bulk('rejected')}>{t('Reject')}</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({})}>{t('Delete')}</Button>
        </BulkBar>
        <DataTable columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload} selection={{ selected, onChange: setSelected }} sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }} skeleton={<TableSkeleton columns={['w-4', 'w-40', 'w-28', 'w-20', 'w-64', 'w-16', 'w-20']} />} empty={<EmptyState icon={Star} title="No reviews yet" message="Customer reviews submitted through the API appear here for moderation." />} />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>
      <Modal open={Boolean(reply)} onClose={() => setReply(null)} title="Reply to review" description={reply?.row.product?.name} footer={<><Button variant="secondary" onClick={() => setReply(null)}>{t('Cancel')}</Button><Button busy={busy} busyLabel="Saving…" onClick={saveReply}>{t('Save reply')}</Button></>}>
        {reply && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200"><Stars value={reply.row.rating} /><p className="mt-1">{reply.row.comment || 'No comment'}</p></div>
            <TextArea label="Your reply" rows={4} value={reply.text} onChange={(event) => setReply((current) => ({ ...current, text: event.target.value }))} />
          </div>
        )}
      </Modal>
      <ConfirmationModal open={Boolean(confirm)} busy={busy} onClose={() => setConfirm(null)} onConfirm={runConfirmed} title={confirm?.row ? 'Delete this review?' : `Delete ${selected.size} review(s)?`} message="The product rating is recalculated. This can’t be undone." />
    </>
  );
}
