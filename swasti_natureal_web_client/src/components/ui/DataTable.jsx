import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import { Checkbox } from './Form.jsx';
import { TableSkeleton } from './Skeleton.jsx';
import { EmptyState, ErrorState } from './EmptyState.jsx';

/**
 * columns: [{ key, header, render?(row, index), sortKey?, className?, headerClassName? }]
 * selection: { selected: Set<id>, onChange(Set) } enables the checkbox column.
 * sort: { sortBy, sortOrder, onSort(key) }
 */
export default function DataTable({
  columns, rows = [], loading, error, onRetry, rowKey = (row) => row.id ?? row._id, selection, sort, empty, skeleton, onRowClick, startIndex = 0,
}) {
  const ids = rows.map(rowKey);
  const selectedCount = selection ? ids.filter((id) => selection.selected.has(id)).length : 0;
  const allSelected = selection && rows.length > 0 && selectedCount === rows.length;

  const toggleAll = (checked) => {
    const next = new Set(selection.selected);
    ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    selection.onChange(next);
  };
  const toggleOne = (id, checked) => {
    const next = new Set(selection.selected);
    if (checked) next.add(id); else next.delete(id);
    selection.onChange(next);
  };

  if (loading && !rows.length) return skeleton ?? <TableSkeleton />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows.length) return empty ?? <EmptyState />;

  return (
    <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading || undefined}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {selection && (
              <th scope="col" className="w-10 py-3 pl-4">
                <Checkbox checked={allSelected} indeterminate={selectedCount > 0} onChange={toggleAll} label="Select all rows on this page" />
              </th>
            )}
            {columns.map((column) => {
              const active = sort && column.sortKey && sort.sortBy === column.sortKey;
              const SortIcon = active ? (sort.sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sort.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 whitespace-nowrap ${column.headerClassName ?? ''}`}>
                  {sort && column.sortKey ? (
                    <button type="button" onClick={() => sort.onSort(column.sortKey)} className={`inline-flex cursor-pointer items-center gap-1 uppercase hover:text-slate-800 ${active ? 'text-teal-700' : ''}`}>
                      {column.header}<SortIcon size={12} className={active ? '' : 'opacity-40'} />
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const id = rowKey(row);
            const selected = selection?.selected.has(id);
            return (
              <tr key={id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`transition-colors ${selected ? 'bg-teal-50/50' : 'hover:bg-slate-50/70'} ${onRowClick ? 'cursor-pointer' : ''}`}>
                {selection && (
                  <td className="py-3 pl-4" onClick={(event) => event.stopPropagation()}>
                    <Checkbox checked={selected} onChange={(checked) => toggleOne(id, checked)} label={`Select row ${startIndex + index + 1}`} />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle text-slate-700 ${column.className ?? ''}`}>
                    {column.render ? column.render(row, startIndex + index) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Sticky bar shown when rows are selected. */
export function BulkBar({ count, onClear, children }) {
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-teal-100 bg-teal-50/70 px-4 py-2.5 motion-safe:animate-fade-up">
      <span className="text-sm font-semibold text-teal-800">{count} selected</span>
      <button type="button" onClick={onClear} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-teal-700 hover:bg-teal-100"><X size={12} /> Clear</button>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Small image cell with a neutral placeholder. */
export function Thumb({ src, alt = '', size = 'h-11 w-11', icon: Icon, rounded = 'rounded-lg' }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`${size} ${rounded} shrink-0 bg-slate-100 object-cover ring-1 ring-slate-200`} />
  ) : (
    <span className={`${size} ${rounded} grid shrink-0 place-items-center bg-slate-100 text-slate-400 ring-1 ring-slate-200`}>{Icon && <Icon size={16} />}</span>
  );
}
