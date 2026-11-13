'use client';

import { useCallback, useState } from 'react';
import { Check, Eye, Loader2, ShieldCheck, Undo2, UserCog } from 'lucide-react';
import { useNavigate } from '@/router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_LABELS } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

const ROLE_ICONS = { superadmin: ShieldCheck, admin: UserCog };
const ROLE_HINTS = {
  superadmin: 'Full access, including administrator accounts',
  admin: 'Day-to-day store management only',
};

/** Switches the dashboard between the real role and a "view as" role, then lands on the dashboard. */
function useRoleSwitch() {
  const { switchRole, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState(null);

  const run = useCallback(async (role) => {
    setPending(role);
    try {
      await switchRole(role);
      navigate('/');
      toast.success(role === user?.role ? t('Back to Super Admin mode') : `${t('Now viewing as')} ${ROLE_LABELS[role]}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending(null);
    }
  }, [switchRole, navigate, toast, user?.role]);

  return { run, pending };
}

/** "Switch dashboard" section for the profile menu. Renders nothing for roles that cannot switch. */
export function RoleSwitchMenu({ onDone }) {
  const { user, activeRole, switchableRoles = [] } = useAuth();
  const { run, pending } = useRoleSwitch();
  if (!switchableRoles.length) return null;

  const options = [user.role, ...switchableRoles];
  return (
    <div className="border-b border-slate-100 px-2 py-2" role="group" aria-label={t('Switch dashboard')}>
      <p className="px-2 pb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t('Switch dashboard')}</p>
      {options.map((role) => {
        const Icon = ROLE_ICONS[role] ?? UserCog;
        const active = role === activeRole;
        return (
          <button
            key={role}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            disabled={active || Boolean(pending)}
            onClick={async () => { await run(role); onDone?.(); }}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition disabled:cursor-default ${active ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className={`block text-sm font-semibold ${active ? 'text-teal-800' : 'text-slate-700'}`}>{ROLE_LABELS[role]}</span>
              <span className="block truncate text-[11px] text-slate-500">{t(ROLE_HINTS[role] ?? '')}</span>
            </span>
            {pending === role ? <Loader2 size={15} className="animate-spin text-slate-400" /> : active && <Check size={15} className="text-teal-600" />}
          </button>
        );
      })}
    </div>
  );
}

/** Persistent notice shown while a super admin is viewing the dashboard as another role. */
export function ViewAsBanner() {
  const { user, activeRole, isViewingAs } = useAuth();
  const { run, pending } = useRoleSwitch();
  if (!isViewingAs) return null;

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
      <Eye size={16} className="shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{t('Viewing as')} {ROLE_LABELS[activeRole]}.</span>{' '}
        <span className="hidden sm:inline">{t('Super-admin-only tools are hidden and blocked until you switch back.')}</span>
      </p>
      <button
        type="button"
        onClick={() => run(user.role)}
        disabled={Boolean(pending)}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600/90 disabled:opacity-70"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
        {t('Return to Super Admin')}
      </button>
    </div>
  );
}
