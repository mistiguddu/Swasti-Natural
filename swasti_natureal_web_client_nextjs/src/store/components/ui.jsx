'use client';

import { Link } from '@/router';
import { Leaf, Minus, Plus, Star } from 'lucide-react';
import { money } from '../../lib/format.js';

/* Shared storefront UI pieces (Tailwind only). */

export const btn = {
  primary: 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60',
  secondary: 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-emerald-900 ring-1 ring-emerald-900/15 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60',
  accent: 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-400 px-6 font-semibold text-emerald-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60',
  ghost: 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 font-semibold text-emerald-900 transition hover:bg-emerald-50',
};

export function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Price({ price, regularPrice, size = 'md', className = '' }) {
  const onSale = regularPrice > price;
  const big = size === 'lg';
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`font-bold text-emerald-900 tabular-nums ${big ? 'text-3xl' : 'text-lg'}`}>{money(price)}</span>
      {onSale && <span className={`text-stone-400 line-through tabular-nums ${big ? 'text-lg' : 'text-sm'}`}>{money(regularPrice)}</span>}
    </span>
  );
}

export function Stars({ value = 0, count, size = 14, className = '' }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`Rated ${value || 0} out of 5${count !== undefined ? `, ${count} reviews` : ''}`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={size} className={star <= rounded ? 'fill-amber-400 text-amber-400' : star - 0.5 === rounded ? 'fill-amber-200 text-amber-400' : 'text-stone-300'} />
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-stone-500">({count})</span>}
    </span>
  );
}

export function StockBadge({ product, className = '' }) {
  if (!product.inStock) return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Out of stock</span>;
  if (product.lowStock) return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Only {product.availableQuantity} left</span>;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In stock</span>;
}

export function SaleBadge({ percentage, className = '' }) {
  if (!percentage) return null;
  return <span className={`rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-emerald-950 shadow-sm ${className}`}>−{percentage}%</span>;
}

export function ProductImage({ src, alt, className = '', imgClassName = '' }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" decoding="async" className={`h-full w-full object-cover ${imgClassName}`} />
  ) : (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-emerald-50 to-stone-100 text-emerald-700/40 ${className}`} aria-label={alt}>
      <Leaf size={40} strokeWidth={1.4} />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className="text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase">{eyebrow}</p>}
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function QuantityStepper({ value, onChange, max = 999, min = 1, size = 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-12';
  return (
    <div className={`inline-flex items-center rounded-full bg-white ring-1 ring-stone-200 ${h}`}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)} className={`grid ${h} w-10 cursor-pointer place-items-center rounded-l-full text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40`}><Minus size={15} /></button>
      <input
        type="number"
        inputMode="numeric"
        aria-label="Quantity"
        value={value}
        min={min}
        max={max}
        onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, Math.round(next)))); }}
        className="w-10 [appearance:textfield] bg-transparent text-center text-sm font-semibold text-stone-900 outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={`grid ${h} w-10 cursor-pointer place-items-center rounded-r-full text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40`}><Plus size={15} /></button>
    </div>
  );
}

export function PageHeader({ title, description, crumbs = [] }) {
  return (
    <div className="border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50/80 to-white">
      <Container className="py-10 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-emerald-800">Home</Link></li>
            {crumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-1.5"><span aria-hidden="true">/</span>{crumb.to ? <Link to={crumb.to} className="hover:text-emerald-800">{crumb.label}</Link> : <span className="text-stone-700">{crumb.label}</span>}</li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-stone-600">{description}</p>}
      </Container>
    </div>
  );
}

export function EmptyBlock({ icon: Icon = Leaf, title, message, action }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-stone-50 px-6 py-16 text-center ring-1 ring-stone-200/70">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-stone-200"><Icon size={28} strokeWidth={1.6} /></span>
      <h2 className="mt-5 font-serif text-2xl font-semibold text-emerald-950">{title}</h2>
      {message && <p className="mt-2 max-w-md text-stone-600">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-3xl bg-rose-50 px-6 py-12 text-center ring-1 ring-rose-100">
      <h2 className="font-serif text-xl font-semibold text-rose-900">Something went wrong</h2>
      <p className="mt-1 text-sm text-rose-800">{error?.message ?? 'Please try again.'}</p>
      {onRetry && <button type="button" onClick={onRetry} className={`${btn.secondary} mt-5 h-10 text-sm`}>Try again</button>}
    </div>
  );
}

/* ── Form fields ── */
const fieldBase = 'h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10';

export function TextField({ label, error, hint, className = '', id, required, ...props }) {
  const inputId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-stone-700">{label}{required && <span className="text-rose-600"> *</span>}</label>
      <input id={inputId} required={required} aria-invalid={Boolean(error)} className={`${fieldBase} ${error ? 'border-rose-300' : 'border-stone-200'}`} {...props} />
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function TextAreaField({ label, error, className = '', id, required, rows = 4, ...props }) {
  const inputId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-stone-700">{label}{required && <span className="text-rose-600"> *</span>}</label>
      <textarea id={inputId} rows={rows} required={required} aria-invalid={Boolean(error)} className={`${fieldBase} h-auto resize-y py-3 ${error ? 'border-rose-300' : 'border-stone-200'}`} {...props} />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function SelectField({ label, error, className = '', id, required, options, placeholder, ...props }) {
  const inputId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-stone-700">{label}{required && <span className="text-rose-600"> *</span>}</label>
      <select id={inputId} required={required} aria-invalid={Boolean(error)} className={`${fieldBase} cursor-pointer ${error ? 'border-rose-300' : 'border-stone-200'}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/** Maps API validation details to { field: message }. */
export function apiFieldErrors(error) {
  const out = {};
  for (const detail of error?.details ?? []) {
    const key = String(detail.path ?? '').replace(/^body\./, '').split('.').pop();
    if (key && !out[key]) out[key] = detail.message;
  }
  return out;
}

export function Skel({ className = '' }) {
  return <span aria-hidden="true" className={`block rounded-lg bg-stone-200/70 motion-safe:animate-pulse ${className}`} />;
}
