'use client';

import { Navigate, useParams } from '@/router';
import { Pencil } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Card, CardHeader, DetailItem, PageHeader } from '../../components/ui/Card.jsx';
import { LinkButton } from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { CategoryDetailsSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { dateTime } from '../../lib/format.js';
import { Avatar } from '../customers/CustomerListPage.jsx';
import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Toggle } from '../../components/ui/Form.jsx';
import { AccessControl, ReadOnlyBadge } from './AccessControl.jsx';

export default function UserDetailsPage() {
  const { id } = useParams();
  const { user: me, can } = useAuth();
  const { data: user, loading, error, reload, setData } = useApi(() => api.get(`/users/${id}`), [id]);
  const toast = useToast();
  const [saving, setSaving] = useState(null);
  const roles = useApi(() => api.get('/users/roles'), []);
  const breadcrumb = [{ label: 'Users', to: '/users' }, { label: user?.name ?? 'Details' }];

  if (loading) return (<><PageHeader breadcrumb={breadcrumb} title="User" /><CategoryDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="User" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);
  if (user.role === 'user' && can('customers.manage')) return <Navigate to={`/customers/${user.id}`} replace />;

  const role = roles.data?.roles.find((item) => item.key === user.role);
  const permissions = roles.data?.permissions.filter((permission) => role?.permissions.includes(permission.key)) ?? [];
  const editable = user.id === me.id || can('admins.manage') || user.role === 'user';
  // Super admins can switch another admin between full / read-only access and enable / disable them here.
  const controllable = user.id !== me.id && user.role !== 'user' && can('admins.manage');

  async function change(kind, body, message) {
    setSaving(kind);
    try {
      setData(await api.patch(`/users/${user.id}/${kind}`, body));
      toast.success(message);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(null);
    }
  }
  const address = [user.address?.line1, user.address?.city, user.address?.country].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader breadcrumb={breadcrumb} title={user.name} description={user.email} actions={editable && <LinkButton to={user.id === me.id ? '/settings/profile' : `/users/${id}/edit`} icon={Pencil}>{t('Edit user')}</LinkButton>} />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="self-start p-6 text-center">
          <div className="flex justify-center"><Avatar name={user.name} size="h-20 w-20 text-3xl" /></div>
          <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{user.name}</h2>
          <div className="mt-2 flex flex-wrap justify-center gap-2"><StatusBadge status={user.role} /><StatusBadge status={user.isActive ? 'active' : 'inactive'} label={user.isActive ? 'Active' : 'Disabled'} tone={user.isActive ? undefined : 'rose'} />{user.role === 'admin' && user.isReadOnly && <ReadOnlyBadge />}</div>
          {controllable && (
            <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-left">
              {user.role === 'admin' && (
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-slate-700">{t('Dashboard access')}</p>
                  <AccessControl value={user.isReadOnly} disabled={saving === 'access'} onChange={(value) => change('access', { isReadOnly: value }, value ? `${user.name} is now read-only` : `${user.name} now has full access`)} />
                </div>
              )}
              <Toggle checked={user.isActive} disabled={saving === 'status'} onChange={(value) => change('status', { isActive: value }, value ? `${user.name} enabled` : `${user.name} disabled`)} label={user.isActive ? 'Account enabled' : 'Account disabled'} description="Disabled accounts can’t sign in and are signed out right away." />
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" />
            <dl className="grid gap-5 p-5 sm:grid-cols-2">
              <DetailItem label="Email">{user.email}</DetailItem>
              <DetailItem label="Phone">{user.phone || null}</DetailItem>
              <DetailItem label="Address">{address || null}</DetailItem>
              <DetailItem label="Last login">{user.lastLoginAt ? dateTime(user.lastLoginAt) : 'Never'}</DetailItem>
              <DetailItem label="Created">{dateTime(user.createdAt)}</DetailItem>
              <DetailItem label="Updated">{dateTime(user.updatedAt)}</DetailItem>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Permissions" description={role ? `${t(role.label)}: ${t(role.description)}` : undefined} />
            <ul className="grid gap-2 p-5 sm:grid-cols-2">
              {permissions.length ? permissions.map((permission) => <li key={permission.key} className="rounded-lg bg-teal-50/60 px-3 py-2 text-sm text-teal-900 ring-1 ring-teal-100">{t(permission.label)}</li>) : <li className="text-sm text-slate-500">{t('No dashboard permissions.')}</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
