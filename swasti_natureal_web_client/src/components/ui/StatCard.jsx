import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { digits, t } from '../../i18n/index.js';

const ACCENTS = {
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** change: % vs previous period (null = no previous data). footnote: secondary line. */
export default function StatCard({ title, value, icon: Icon, accent = 'teal', change, footnote, to, invert = false }) {
  const hasChange = change !== undefined;
  const up = change > 0;
  const good = invert ? !up : up;
  const TrendIcon = change === 0 || change == null ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const trendTone = change === 0 || change == null ? 'bg-slate-100 text-slate-600' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{t(title)}</p>
        {Icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${ACCENTS[accent]}`}><Icon size={18} /></span>}
      </div>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {hasChange && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${trendTone}`}>
            <TrendIcon size={12} aria-hidden="true" />
            {change == null ? t('New') : `${digits(Math.abs(change))}%`}
            <span className="sr-only">{change == null ? 'no previous data' : up ? 'increase' : change === 0 ? 'no change' : 'decrease'}</span>
          </span>
        )}
        {footnote && <span className="text-slate-500">{t(footnote)}</span>}
      </div>
    </>
  );

  const className = 'block rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-slate-200/70 transition';
  return to ? (
    <Link to={to} className={`${className} hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-teal-500`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
