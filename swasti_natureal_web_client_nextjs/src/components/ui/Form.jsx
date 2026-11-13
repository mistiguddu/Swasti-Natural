'use client';

import { useId, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { t } from '../../i18n/index.js';

const control = 'w-full rounded-xl border bg-surface px-3.5 text-sm text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 disabled:bg-slate-50 disabled:text-slate-500';
const border = (error) => (error ? 'border-rose-300' : 'border-slate-200');

export function Field({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {t(label)}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{t(error)}</p> : hint && <p className="mt-1.5 text-xs text-slate-400">{t(hint)}</p>}
    </div>
  );
}

export function FormInput({ label, error, hint, required, className, prefix, suffix, id, placeholder, ...props }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3.5 text-sm text-slate-400">{prefix}</span>}
        <input id={inputId} placeholder={t(placeholder)} required={required} aria-invalid={Boolean(error)} className={`${control} ${border(error)} h-10 ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''}`} {...props} />
        {suffix && <span className="pointer-events-none absolute right-3.5 text-xs text-slate-400">{suffix}</span>}
      </div>
    </Field>
  );
}

export function TextArea({ label, error, hint, required, className, rows = 4, id, placeholder, ...props }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <textarea id={inputId} placeholder={t(placeholder)} rows={rows} required={required} aria-invalid={Boolean(error)} className={`${control} ${border(error)} resize-y py-2.5 leading-relaxed`} {...props} />
    </Field>
  );
}

/** options: [{ value, label }] or strings */
export function SelectInput({ label, error, hint, required, className, options = [], placeholder, id, ...props }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        <select id={inputId} required={required} aria-invalid={Boolean(error)} className={`${control} ${border(error)} h-10 cursor-pointer appearance-none pr-9`} {...props}>
          {placeholder !== undefined && <option value="">{t(placeholder)}</option>}
          {options.map((option) => {
            const { value, label: text, disabled } = typeof option === 'string' ? { value: option, label: option } : option;
            return <option key={value} value={value} disabled={disabled}>{t(text)}</option>;
          })}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
      </div>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled, size = 'md' }) {
  const id = useId();
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4 peer-checked:translate-x-4' : 'h-5 w-5 peer-checked:translate-x-5';
  return (
    <label htmlFor={id} className={`flex w-fit items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className={`relative mt-0.5 inline-flex shrink-0 ${track}`}>
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={Boolean(checked)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span className={`absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-teal-600 peer-focus-visible:ring-4 peer-focus-visible:ring-teal-500/25 ${track}`} />
        <span className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition ${knob}`} />
      </span>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-semibold text-slate-700">{t(label)}</span>}
          {description && <span className="block text-xs text-slate-500">{t(description)}</span>}
        </span>
      )}
    </label>
  );
}

export function Checkbox({ checked, indeterminate, onChange, label, className = '' }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={Boolean(checked)}
      ref={(element) => { if (element) element.indeterminate = Boolean(indeterminate) && !checked; }}
      onChange={(event) => onChange(event.target.checked)}
      className={`h-4 w-4 cursor-pointer rounded border-slate-300 accent-teal-600 ${className}`}
    />
  );
}

export function FormSection({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6 ${className}`}>
      <div className="mb-5">
        <h2 className="font-display text-[15px] font-bold text-slate-900">{t(title)}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{t(description)}</p>}
      </div>
      {children}
    </section>
  );
}

/** Free-text chips (tags, colours, sizes, SEO keywords). Enter or comma adds a value. */
export function TagInput({ label, value = [], onChange, placeholder = 'Type and press Enter', hint, className }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const add = (text) => {
    const items = text.split(',').map((item) => item.trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...value, ...items])]);
    setDraft('');
  };
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-2 py-1.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15">
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 py-0.5 pr-1 pl-2 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
            {item}
            <button type="button" onClick={() => onChange(value.filter((entry) => entry !== item))} className="cursor-pointer rounded p-0.5 text-teal-600 hover:bg-teal-100" aria-label={`Remove ${item}`}><X size={12} /></button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(draft); }
            if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : t(placeholder)}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </Field>
  );
}

/** Maps API validation details ([{ path: 'body.name', message }]) to { name: message }. */
export function fieldErrors(error) {
  const errors = {};
  for (const detail of error?.details ?? []) {
    const key = String(detail.path ?? '').replace(/^body\./, '');
    if (key && !errors[key]) errors[key] = detail.message;
  }
  return errors;
}
