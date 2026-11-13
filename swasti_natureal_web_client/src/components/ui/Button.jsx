import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';

const VARIANTS = {
  primary: 'bg-teal-600 text-white shadow-sm shadow-teal-600/20 hover:bg-teal-600/90 disabled:bg-teal-600/60',
  secondary: 'bg-surface text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 disabled:bg-rose-600/60',
  'danger-ghost': 'text-rose-600 hover:bg-rose-50',
  soft: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100 hover:bg-teal-100',
};
const SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

export function buttonClass(variant = 'primary', size = 'md', className = '') {
  return `inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

/** `busy` swaps the label (no spinner) and disables the button. */
export function Button({ variant, size, className, icon: Icon, busy, busyLabel, children, type = 'button', ...props }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={busy || props.disabled} aria-busy={busy || undefined} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} className={busy ? 'motion-safe:animate-pulse' : ''} />}
      {busy ? t(busyLabel ?? 'Working…') : t(children)}
    </button>
  );
}

export function LinkButton({ to, variant, size, className, icon: Icon, children, ...props }) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {t(children)}
    </Link>
  );
}

export function IconButton({ icon: Icon, label, variant = 'ghost', className = '', size = 16, ...props }) {
  const tone = {
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
    danger: 'text-slate-500 hover:bg-rose-50 hover:text-rose-600',
    teal: 'text-slate-500 hover:bg-teal-50 hover:text-teal-700',
  }[variant];
  return (
    <button type="button" aria-label={t(label)} title={t(label)} className={`inline-grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${className}`} {...props}>
      <Icon size={size} />
    </button>
  );
}
