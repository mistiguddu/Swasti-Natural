'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronDown, Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useApi.js';
import { t } from '../../i18n/index.js';

/** Debounced search box; calls onSearch with the trimmed value. */
export function SearchInput({ value = '', onSearch, placeholder = 'Search…', className = '' }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text);
  const first = useRef(true);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (debounced.trim() !== value) onSearch(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t(placeholder)}
        aria-label={t(placeholder)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-surface pr-9 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" onClick={() => { setText(''); onSearch(''); }} className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Compact select used in table toolbars. */
export function FilterDropdown({ label, value, onChange, options, allLabel = 'All', className = '' }) {
  const active = value !== '' && value != null;
  return (
    <label className={`relative inline-flex h-10 items-center rounded-xl border bg-surface text-sm transition focus-within:ring-4 focus-within:ring-teal-500/15 ${active ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200'} ${className}`}>
      <span className="pointer-events-none pl-3 text-xs font-medium whitespace-nowrap text-slate-500">{t(label)}:</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-1.5 font-semibold text-slate-700 outline-none">
        <option value="">{t(allLabel)}</option>
        {options.map((option) => {
          const { value: optionValue, label: text } = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={optionValue} value={optionValue}>{t(text)}</option>;
        })}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 text-slate-400" />
    </label>
  );
}

export const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const todayIso = () => new Date().toLocaleDateString('en-CA');

/** Segmented date-range filter. value: { range, from, to } */
export function DateRangeFilter({ value, onChange, className = '' }) {
  const [custom, setCustom] = useState({ from: value.from || '', to: value.to || '' });
  const isCustom = value.range === 'custom';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex flex-wrap rounded-xl bg-surface p-1 ring-1 ring-slate-200" role="radiogroup" aria-label="Date range">
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            role="radio"
            aria-checked={value.range === range.value}
            onClick={() => {
              if (range.value === 'custom') {
                const from = custom.from || new Date(Date.now() - 29 * 864e5).toLocaleDateString('en-CA');
                const to = custom.to || todayIso();
                setCustom({ from, to });
                onChange({ range: 'custom', from, to });
              } else onChange({ range: range.value, from: '', to: '' });
            }}
            className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition ${value.range === range.value ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t(range.label)}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 ring-1 ring-slate-200">
          <CalendarRange size={15} className="text-slate-400" />
          <input type="date" aria-label="From date" value={custom.from} max={custom.to || todayIso()} onChange={(event) => setCustom((current) => ({ ...current, from: event.target.value }))} className="cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none" />
          <span className="text-xs text-slate-400">{t('to')}</span>
          <input type="date" aria-label="To date" value={custom.to} min={custom.from} max={todayIso()} onChange={(event) => setCustom((current) => ({ ...current, to: event.target.value }))} className="cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none" />
          <button type="button" disabled={!custom.from || !custom.to} onClick={() => onChange({ range: 'custom', ...custom })} className="ml-1 h-7 cursor-pointer rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white disabled:opacity-50">{t('Apply')}</button>
        </div>
      )}
    </div>
  );
}
