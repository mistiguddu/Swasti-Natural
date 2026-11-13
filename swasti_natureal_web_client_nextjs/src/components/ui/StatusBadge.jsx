'use client';

import { titleCase } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

const STATUS_TONES = {
  active: 'green', inactive: 'slate', draft: 'amber',
  in_stock: 'green', out_of_stock: 'rose', backorder: 'amber', low_stock: 'orange',
  pending: 'amber', confirmed: 'sky', processing: 'violet', shipped: 'teal', delivered: 'green', cancelled: 'rose', returned: 'orange',
  paid: 'green', failed: 'rose', refunded: 'slate',
  approved: 'green', rejected: 'rose',
  superadmin: 'violet', admin: 'sky', user: 'slate',
  expired: 'slate', scheduled: 'sky',
};

const LABELS = { in_stock: 'In stock', out_of_stock: 'Out of stock', low_stock: 'Low stock', superadmin: 'Super Admin', user: 'Customer' };

export default function StatusBadge({ status, label, tone, className = '' }) {
  const color = TONES[tone ?? STATUS_TONES[status] ?? 'slate'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${color} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label ? t(label) : LABELS[status] ? t(LABELS[status]) : titleCase(status)}
    </span>
  );
}
