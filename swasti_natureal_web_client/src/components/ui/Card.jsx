import Breadcrumb from '../layout/Breadcrumb.jsx';

export function Card({ className = '', children, ...props }) {
  return <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`} {...props}>{children}</section>;
}

export function CardHeader({ title, description, actions, icon: Icon, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100"><Icon size={17} /></span>}
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, breadcrumb, children }) {
  return (
    <div className="mb-6">
      <Breadcrumb items={breadcrumb} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** Label/value pair used on details pages. */
export function DetailItem({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words text-slate-800">{children ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}
