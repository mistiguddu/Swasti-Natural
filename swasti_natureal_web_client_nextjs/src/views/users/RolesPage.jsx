'use client';

import { Link } from '@/router';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card.jsx';
import { DashboardCardSkeleton, TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { number } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

export default function RolesPage() {
  const { data, loading, error, reload } = useApi(() => api.get('/users/roles'), []);
  if (loading) return (<><PageHeader title="Roles & Permissions" /><div className="space-y-6"><DashboardCardSkeleton count={3} /><Card><TableSkeleton rows={10} columns={['w-56', 'w-10', 'w-10', 'w-10']} /></Card></div></>);
  if (error) return (<><PageHeader title="Roles & Permissions" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);
  const groups = [...new Set(data.permissions.map((permission) => permission.group))];

  return (
    <>
      <PageHeader title="Roles & Permissions" description="What each role can do. Permissions are enforced by the API on every request." />
      <div className="grid gap-4 md:grid-cols-3">
        {data.roles.map((role) => (
          <Card key={role.key} className="p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100"><ShieldCheck size={18} /></span>
              <StatusBadge status={role.key} />
            </div>
            <h2 className="mt-3 font-display text-base font-bold text-slate-900">{t(role.label)}</h2>
            <p className="mt-1 text-sm text-slate-500">{t(role.description)}</p>
            <p className="mt-4 text-sm"><Link to={role.key === 'user' ? '/customers' : `/users?role=${role.key}`} className="font-semibold text-teal-700 hover:underline">{number(role.users)} account(s)</Link> · {role.permissions.length} permissions</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader title="Permission matrix" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3">{t('Permission')}</th>
                {data.roles.map((role) => <th key={role.key} className="px-4 py-3 text-center">{t(role.label)}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => [
                <tr key={group}><td colSpan={data.roles.length + 1} className="bg-slate-50/40 px-5 pt-4 pb-1.5 text-xs font-bold text-slate-400 uppercase">{t(group)}</td></tr>,
                ...data.permissions.filter((permission) => permission.group === group).map((permission) => (
                  <tr key={permission.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{t(permission.label)}<code className="ml-2 text-[11px] text-slate-400">{permission.key}</code></td>
                    {data.roles.map((role) => (
                      <td key={role.key} className="px-4 py-3 text-center">
                        {role.permissions.includes(permission.key)
                          ? <Check size={16} className="mx-auto text-emerald-600" aria-label="Allowed" />
                          : <Minus size={16} className="mx-auto text-slate-300" aria-label="Not allowed" />}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
