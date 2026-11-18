'use client';

import { Eye, ShieldCheck } from 'lucide-react';
import { t } from '../../i18n/index.js';

const OPTIONS = [
  { value: false, label: 'Full access', short: 'Full', icon: ShieldCheck, hint: 'Can view and change everything their role allows.' },
  { value: true, label: 'Read only', short: 'Read only', icon: Eye, hint: 'Can open every page but cannot create, edit or delete anything.' },
];

/**
 * Full access ⇄ Read only switch for an administrator account.
 * `compact` is the small pill used in tables; the default is two cards for forms.
 */
export function AccessControl({ value, onChange, disabled, compact = false }) {
  if (compact) {
    return (
      <div role="radiogroup" aria-label={t('Access')} className={`inline-flex rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200 ${disabled ? 'opacity-50' : ''}`}>
        {OPTIONS.map((option) => {
          const active = Boolean(value) === option.value;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !active && onChange(option.value)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition disabled:cursor-not-allowed ${active ? (option.value ? 'bg-amber-500 text-white shadow-sm' : 'bg-surface text-teal-700 shadow-sm') : 'text-slate-500 hover:text-slate-800'}`}
            >
              <option.icon size={12} /> {t(option.short)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={t('Access')} className="grid gap-2">
      {OPTIONS.map((option) => {
        const active = Boolean(value) === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? (option.value ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-teal-50 ring-2 ring-teal-500') : 'ring-slate-200 hover:bg-slate-50'}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? (option.value ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white') : 'bg-slate-100 text-slate-500'}`}><option.icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{t(option.label)}</span>
              <span className="block text-xs leading-snug text-slate-500">{t(option.hint)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small amber badge shown next to a read-only admin's role. */
export function ReadOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-700 ring-1 ring-amber-200 ring-inset">
      <Eye size={12} /> {t('Read only')}
    </span>
  );
}
