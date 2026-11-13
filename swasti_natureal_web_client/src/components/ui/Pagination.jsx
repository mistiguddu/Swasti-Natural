import { ChevronLeft, ChevronRight } from 'lucide-react';
import { digits, t } from '../../i18n/index.js';

function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, index) => {
    if (index && p - sorted[index - 1] > 1) result.push(`gap-${p}`);
    result.push(p);
  });
  return result;
}

export default function Pagination({ pagination, onPageChange, onLimitChange, limits = [10, 20, 50, 100] }) {
  if (!pagination) return null;
  const { page, limit, total, totalPages } = pagination;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  const button = 'grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{t('Showing')} <strong className="text-slate-800">{digits(from)}–{digits(to)}</strong> {t('of')} <strong className="text-slate-800">{digits(total)}</strong> {t('results')}</span>
        {onLimitChange && (
          <label className="inline-flex items-center gap-1.5">
            {t('Rows')}
            <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))} className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-surface px-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
              {limits.map((value) => <option key={value} value={value}>{digits(value)}</option>)}
            </select>
          </label>
        )}
      </div>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" className={`${button} text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50`} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <span className="flex items-center gap-1 px-1"><ChevronLeft size={14} /> <span className="hidden sm:inline">{t('Prev')}</span></span>
        </button>
        {pageList(page, totalPages).map((item) => (typeof item === 'string' ? (
          <span key={item} className="px-1 text-xs text-slate-400">…</span>
        ) : (
          <button key={item} type="button" aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)} className={`${button} ${item === page ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{digits(item)}</button>
        )))}
        <button type="button" className={`${button} text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50`} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span className="flex items-center gap-1 px-1"><span className="hidden sm:inline">{t('Next')}</span> <ChevronRight size={14} /></span>
        </button>
      </nav>
    </div>
  );
}
