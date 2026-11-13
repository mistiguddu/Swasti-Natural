import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useApi.js';
import { Skeleton } from './Skeleton.jsx';
import { t } from '../../i18n/index.js';

/** Search-as-you-type picker. fetchOptions(term) → items; renderItem(item) → node. */
export default function AsyncPicker({ label, placeholder, fetchOptions, renderItem, onSelect, emptyText = 'No matches' }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ items: [], loading: false });
  const debounced = useDebounce(term, 300);
  const box = useRef(null);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState((current) => ({ ...current, loading: true }));
    fetchRef.current(debounced).then((items) => active && setState({ items, loading: false })).catch(() => active && setState({ items: [], loading: false }));
    return () => { active = false; };
  }, [debounced, open]);

  useEffect(() => {
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative">
      {label && <p className="mb-1.5 text-[13px] font-semibold text-slate-700">{t(label)}</p>}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(event) => { setTerm(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
          placeholder={t(placeholder)}
          aria-label={t(label ?? placeholder)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-surface pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15"
        />
      </div>
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl bg-surface py-1 shadow-xl ring-1 ring-slate-200">
          {state.loading ? (
            <div className="space-y-2 p-3">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-8 w-full" />)}</div>
          ) : state.items.length ? state.items.map((item) => (
            <button key={item.id} type="button" onClick={() => { onSelect(item); setTerm(''); setOpen(false); }} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50">
              {renderItem(item)}
            </button>
          )) : <p className="px-3 py-3 text-sm text-slate-500">{t(emptyText)}</p>}
        </div>
      )}
    </div>
  );
}
