/* Skeleton UI (no spinners). Shapes mirror the real content to avoid layout shift. */

export function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`block rounded-md bg-slate-200/70 motion-safe:animate-pulse ${className}`} />;
}

function Busy({ label, children, className = '' }) {
  return <div role="status" aria-label={label} aria-busy="true" className={className}>{children}<span className="sr-only">{label}</span></div>;
}

export function DashboardCardSkeleton({ count = 4 }) {
  return (
    <Busy label="Loading summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-10 rounded-xl" /></div>
          <Skeleton className="mt-4 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
      ))}
    </Busy>
  );
}

export function DashboardChartSkeleton({ height = 'h-72', title = true }) {
  return (
    <Busy label="Loading chart" className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {title && <div className="border-b border-slate-100 px-5 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2 h-3 w-56" /></div>}
      <div className={`flex items-end gap-2 px-5 pt-6 pb-5 ${height}`}>
        {[45, 70, 55, 80, 40, 65, 90, 60, 75, 50, 85, 68].map((value, index) => (
          <span key={index} className="flex-1 rounded-t-md bg-slate-200/60 motion-safe:animate-pulse" style={{ height: `${value}%` }} />
        ))}
      </div>
    </Busy>
  );
}

/** Generic table skeleton. columns: array of width classes, e.g. ['w-4', 'w-10 h-10 rounded-lg', 'w-40']. */
export function TableSkeleton({ rows = 8, columns = ['w-4', 'w-8', 'w-10 h-10 rounded-lg', 'w-40', 'w-24', 'w-20', 'w-16', 'w-24', 'w-16'], label = 'Loading table' }) {
  return (
    <Busy label={label}>
      <div className="hidden border-b border-slate-100 bg-slate-50/70 px-4 py-3 md:flex md:gap-6">
        {columns.map((_, index) => <Skeleton key={index} className="h-3 w-14" />)}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-6 border-b border-slate-100 px-4 py-3.5 last:border-0">
          {columns.map((width, index) => <Skeleton key={index} className={`h-3.5 shrink-0 ${width} ${index > 3 ? 'hidden md:block' : ''}`} />)}
        </div>
      ))}
    </Busy>
  );
}

export const CategoryTableSkeleton = (props) => <TableSkeleton label="Loading categories" columns={['w-4', 'w-6', 'w-11 h-11 rounded-lg', 'w-9 h-9 rounded-lg', 'w-36', 'w-20', 'w-24', 'w-10', 'w-12', 'w-16', 'w-20', 'w-20']} {...props} />;
export const ProductTableSkeleton = (props) => <TableSkeleton label="Loading products" columns={['w-4', 'w-6', 'w-11 h-11 rounded-lg', 'w-44', 'w-20', 'w-24', 'w-16', 'w-16', 'w-12', 'w-12', 'w-16', 'w-20', 'w-20']} {...props} />;
export const CustomerTableSkeleton = (props) => <TableSkeleton label="Loading customers" columns={['w-9 h-9 rounded-full', 'w-40', 'w-44', 'w-24', 'w-12', 'w-20', 'w-20', 'w-16']} {...props} />;
export const OrderTableSkeleton = (props) => <TableSkeleton label="Loading orders" columns={['w-24', 'w-36', 'w-12', 'w-20', 'w-20', 'w-20', 'w-24', 'w-12']} {...props} />;

export function FormSkeleton({ sections = 2, fields = 4 }) {
  return (
    <Busy label="Loading form" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {Array.from({ length: sections }, (_, section) => (
          <div key={section} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-64" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {Array.from({ length: fields }, (_, field) => (
                <div key={field}><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-10 w-full rounded-xl" /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-40 w-full rounded-xl" /></div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><Skeleton className="h-4 w-24" /><Skeleton className="mt-5 h-10 w-full rounded-xl" /></div>
      </div>
    </Busy>
  );
}

function DetailsSkeleton({ label, media }) {
  return (
    <Busy label={label} className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex gap-3">{Array.from({ length: media }, (_, index) => <Skeleton key={index} className="h-16 w-16 rounded-lg" />)}</div>
      </div>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <Skeleton className="h-6 w-64" /><Skeleton className="mt-3 h-3 w-40" />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index}><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-4 w-28" /></div>)}</div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-11/12" /><Skeleton className="h-3 w-4/5" /></div>
        </div>
      </div>
    </Busy>
  );
}

export const ProductDetailsSkeleton = () => <DetailsSkeleton label="Loading product" media={4} />;
export const CategoryDetailsSkeleton = () => <DetailsSkeleton label="Loading category" media={1} />;

export function ListSkeleton({ rows = 5 }) {
  return (
    <Busy label="Loading" className="divide-y divide-slate-100">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="flex-1"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="mt-2 h-3 w-1/3" /></div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </Busy>
  );
}

/** Full admin shell skeleton, shown while the session is checked. */
export function AppShellSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex min-h-screen bg-slate-50 font-body">
      <div className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-2xl" /><Skeleton className="h-4 w-28" /></div>
        <div className="mt-10 space-y-4">{Array.from({ length: 10 }, (_, index) => <div key={index} className="flex items-center gap-3"><Skeleton className="h-5 w-5 rounded-md" /><Skeleton className="h-3.5 w-32" /></div>)}</div>
      </div>
      <div className="flex-1">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6"><Skeleton className="h-9 w-72 rounded-xl" /><Skeleton className="h-9 w-9 rounded-full" /></div>
        <div className="space-y-6 p-6"><Skeleton className="h-7 w-56" /><DashboardCardSkeleton /><DashboardChartSkeleton /></div>
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
