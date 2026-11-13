import { Navigate, useParams } from 'react-router-dom';
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

export default function UserDetailsPage() {
  const { id } = useParams();
  const { user: me, can } = useAuth();
  const { data: user, loading, error, reload } = useApi(() => api.get(`/users/${id}`), [id]);
  const roles = useApi(() => api.get('/users/roles'), []);
  const breadcrumb = [{ label: 'Users', to: '/users' }, { label: user?.name ?? 'Details' }];

  if (loading) return (<><PageHeader breadcrumb={breadcrumb} title="User" /><CategoryDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="User" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);
  if (user.role === 'user' && can('customers.manage')) return <Navigate to={`/customers/${user.id}`} replace />;

  const role = roles.data?.roles.find((item) => item.key === user.role);
  const permissions = roles.data?.permissions.filter((permission) => role?.permissions.includes(permission.key)) ?? [];
  const editable = user.id === me.id || can('admins.manage') || user.role === 'user';
  const address = [user.address?.line1, user.address?.city, user.address?.country].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader breadcrumb={breadcrumb} title={user.name} description={user.email} actions={editable && <LinkButton to={user.id === me.id ? '/settings/profile' : `/users/${id}/edit`} icon={Pencil}>Edit user</LinkButton>} />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="self-start p-6 text-center">
          <div className="flex justify-center"><Avatar name={user.name} size="h-20 w-20 text-3xl" /></div>
          <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{user.name}</h2>
          <div className="mt-2 flex justify-center gap-2"><StatusBadge status={user.role} /><StatusBadge status={user.isActive ? 'active' : 'inactive'} /></div>
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
            <CardHeader title="Permissions" description={role ? `${role.label}: ${role.description}` : undefined} />
            <ul className="grid gap-2 p-5 sm:grid-cols-2">
              {permissions.length ? permissions.map((permission) => <li key={permission.key} className="rounded-lg bg-teal-50/60 px-3 py-2 text-sm text-teal-900 ring-1 ring-teal-100">{permission.label}</li>) : <li className="text-sm text-slate-500">No dashboard permissions.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
