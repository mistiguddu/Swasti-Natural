'use client';

import { useState } from 'react';
import { Link, useNavigate } from '@/router';
import { Eye, Pencil, Trash2, UserCog, UserPlus } from 'lucide-react';
import { api } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { IconButton, LinkButton } from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import { Toggle } from '../../components/ui/Form.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { CustomerTableSkeleton } from '../../components/ui/Skeleton.jsx';
import { date, dateTime } from '../../lib/format.js';
import { Avatar } from '../customers/CustomerListPage.jsx';
import { t } from '../../i18n/index.js';

export default function UserListPage({ preset }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me, can } = useAuth();
  const { params, update, toggleSort, key } = useListParams();
  const query = { ...params, ...(preset ? { role: params.role || preset } : {}) };
  const { data, loading, error, reload, setData } = useApi(() => api.get('/users', query), [key, preset]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const manageable = (row) => row.id !== me.id && (row.role === 'user' || can('admins.manage'));

  async function setActive(row, isActive) {
    setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, isActive } : item)) }));
    try {
      await api.patch(`/users/${row.id}/status`, { isActive });
    } catch (requestError) {
      setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, isActive: row.isActive } : item)) }));
      toast.error(requestError.message);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/users/${confirm.id}`);
      toast.success(`${confirm.name} deleted`);
      setConfirm(null);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'name', header: 'User', sortKey: 'name', render: (row) => (
        <div className="flex min-w-48 items-center gap-3">
          <Avatar name={row.name} />
          <div className="min-w-0 leading-tight">
            <Link to={`/users/${row.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{row.name}{row.id === me.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}</Link>
            <p className="truncate text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortKey: 'role', render: (row) => <StatusBadge status={row.role} /> },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || <span className="text-slate-300">—</span> },
    { key: 'lastLoginAt', header: 'Last login', sortKey: 'lastLoginAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => (row.lastLoginAt ? dateTime(row.lastLoginAt) : 'Never') },
    { key: 'createdAt', header: 'Created', sortKey: 'createdAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => date(row.createdAt) },
    { key: 'status', header: 'Status', render: (row) => <Toggle size="sm" checked={row.isActive} disabled={!manageable(row)} onChange={(value) => setActive(row, value)} label={<span className="text-xs font-medium">{t(row.isActive ? 'Active' : 'Inactive')}</span>} /> },
    {
      key: 'actions', header: <span className="sr-only">{t('Actions')}</span>, className: 'text-right', render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Eye} variant="teal" label={`View ${row.name}`} onClick={() => navigate(`/users/${row.id}`)} />
          <IconButton icon={Pencil} variant="teal" label={`Edit ${row.name}`} disabled={row.id !== me.id && !manageable(row)} onClick={() => navigate(row.id === me.id ? '/settings/profile' : `/users/${row.id}/edit`)} />
          <IconButton icon={Trash2} variant="danger" label={`Delete ${row.name}`} disabled={!manageable(row)} onClick={() => setConfirm(row)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={preset ? 'Admin Users' : 'User List'}
        description={preset ? 'Accounts with access to this dashboard.' : 'All accounts: customers, administrators and super administrators.'}
        actions={<LinkButton to={`/users/new${preset ? '?role=admin' : ''}`} icon={UserPlus}>{t('Add User')}</LinkButton>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder="Search name, email or phone…" className="w-full sm:w-80" />
          <FilterDropdown label="Role" value={params.role ?? ''} onChange={(role) => update({ role })} allLabel={preset ? 'All staff' : 'All'} options={[...(preset ? [] : [{ value: 'user', label: 'Customer' }, { value: 'staff', label: 'All staff' }]), { value: 'admin', label: 'Administrator' }, { value: 'superadmin', label: 'Super Administrator' }]} />
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload} sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }} skeleton={<CustomerTableSkeleton />} empty={<EmptyState icon={UserCog} title="No users found" />} />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>
      <ConfirmationModal open={Boolean(confirm)} busy={busy} onClose={() => setConfirm(null)} onConfirm={remove} title={`Delete ${confirm?.name}?`} message="Customers with orders can’t be deleted — deactivate them instead. This can’t be undone." />
    </>
  );
}
