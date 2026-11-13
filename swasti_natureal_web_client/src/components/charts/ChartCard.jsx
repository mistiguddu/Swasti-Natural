import { BarChart3 } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.jsx';
import { DashboardChartSkeleton } from '../ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../ui/EmptyState.jsx';
import { digits, t } from '../../i18n/index.js';

/** Card wrapper that handles loading (skeleton), error and empty states for a chart. */
export function ChartCard({ title, description, actions, loading, error, onRetry, isEmpty, emptyMessage, height = 'h-72', className = '', children }) {
  if (loading) return <DashboardChartSkeleton height={height} />;
  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader title={title} description={description} actions={actions} />
      {error ? <ErrorState error={error} onRetry={onRetry} className="py-10" />
        : isEmpty ? <EmptyState icon={BarChart3} title="No data for this period" message={emptyMessage ?? 'Try a wider date range.'} className="py-10" />
          : <div className="flex-1 px-3 pt-4 pb-3 sm:px-5">{children}</div>}
    </Card>
  );
}

/** Tooltip in text tokens; the coloured dot carries series identity. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (value) => value }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl bg-surface px-3 py-2.5 text-xs shadow-xl ring-1 ring-slate-200">
      <p className="mb-1.5 font-semibold text-slate-800">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-slate-600">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color ?? entry.payload?.fill }} aria-hidden="true" />
            <span>{t(entry.name)}</span>
            <span className="ml-auto pl-3 font-semibold text-slate-900 tabular-nums">{valueFormatter(entry.value, entry)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend with the series' colours, text stays in ink colours. */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block ${item.dashed ? 'h-0 w-3 border-t-2 border-dashed' : 'h-2 w-2 rounded-full'}`} style={item.dashed ? { borderColor: item.color } : { background: item.color }} aria-hidden="true" />
          {t(item.label)}
        </li>
      ))}
    </ul>
  );
}

/** Ranked horizontal bars rendered in HTML (readable labels, no axis clutter). */
export function BarList({ items, valueFormatter, color = 'var(--color-teal-600)', secondary }) {
  const max = Math.max(...items.map((item) => item.value), 0) || 1;
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.key ?? item.label} className="group">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="w-4 text-xs font-semibold text-slate-400 tabular-nums">{digits(index + 1)}</span>
              {item.image !== undefined && (item.image
                ? <img src={item.image} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
                : <span className="h-7 w-7 shrink-0 rounded-md bg-slate-100 ring-1 ring-slate-200" />)}
              <span className="truncate font-medium text-slate-700">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{valueFormatter(item.value)}</span>
          </div>
          <div className="mt-1.5 ml-6.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }} />
            </div>
            {secondary && <span className="w-24 shrink-0 text-right text-[11px] text-slate-500">{secondary(item)}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
