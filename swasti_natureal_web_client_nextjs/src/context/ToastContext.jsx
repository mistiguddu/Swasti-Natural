'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { t } from '../i18n/index.js';

/*
 * One toaster for the storefront and the admin dashboard.
 *
 *   toast.success('Product updated')                       → "Success" + message
 *   toast.error(error.message)                             → "Failed" + message (stays longer)
 *   toast.warning('Only 2 left'), toast.info('Signed out')
 *   toast.success('Removed', { title: 'Cart', action: { label: 'Undo', onClick } })
 *   const id = toast.loading('Saving…'); toast.update(id, 'success', 'Saved')
 *   toast.promise(api.put(...), { loading: 'Saving…', success: 'Saved', error: (e) => e.message })
 *
 * Phones: top of the screen (clear of the bottom nav and sticky bars). sm+: bottom-right,
 * lifted by --toast-offset when the storefront chat button is there.
 * Hover / touch pauses the countdown; swipe sideways or press × to dismiss.
 */

const ToastContext = createContext(null);
let nextId = 0; // crypto.randomUUID() is unavailable on plain-http LAN addresses

const MAX_VISIBLE = 4;
const DURATION = { success: 3500, info: 4000, warning: 5000, error: 6500, loading: null };
const TITLES = { success: 'Success', error: 'Failed', warning: 'Warning', info: 'Notice', loading: 'Please wait' };

const KIND = {
  success: { icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-500/15' },
  error: { icon: XCircle, badge: 'bg-rose-100 text-rose-600', bar: 'bg-rose-500', ring: 'ring-rose-500/20' },
  warning: { icon: AlertTriangle, badge: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500', ring: 'ring-amber-500/20' },
  info: { icon: Info, badge: 'bg-sky-100 text-sky-600', bar: 'bg-sky-500', ring: 'ring-sky-500/15' },
  loading: { icon: Loader2, badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-400', ring: 'ring-slate-500/10' },
};

function ToastItem({ toast, onDismiss }) {
  const kind = KIND[toast.type] ?? KIND.info;
  const Icon = kind.icon;
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef(null);
  const remaining = useRef(toast.duration);
  const timer = useRef(null);
  const startedAt = useRef(0);

  // Countdown that pauses on hover/touch and restarts when the toast changes (e.g. loading → success).
  useEffect(() => {
    remaining.current = toast.duration;
  }, [toast.version, toast.duration]);
  useEffect(() => {
    if (toast.leaving || !toast.duration || paused) return undefined;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer.current);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, toast.id, toast.version, toast.duration, toast.leaving, onDismiss]);

  const swipe = {
    onPointerDown: (event) => { if (event.pointerType !== 'mouse') { start.current = event.clientX; setPaused(true); } },
    onPointerMove: (event) => { if (start.current !== null) setDrag(event.clientX - start.current); },
    onPointerUp: () => {
      if (start.current === null) return;
      start.current = null;
      if (Math.abs(drag) > 80) onDismiss(toast.id);
      else { setDrag(0); setPaused(false); }
    },
    onPointerCancel: () => { start.current = null; setDrag(0); setPaused(false); },
  };

  const title = toast.title ?? TITLES[toast.type];
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      {...swipe}
      style={drag ? { transform: `translateX(${drag}px)`, opacity: Math.max(0, 1 - Math.abs(drag) / 220) } : undefined}
      className={`pointer-events-auto relative w-full touch-pan-y overflow-hidden rounded-2xl bg-surface text-left shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] ring-1 ${kind.ring} sm:w-[380px] ${toast.leaving ? 'motion-safe:animate-toast-out' : 'motion-safe:animate-toast-in'} ${drag ? '' : 'transition-transform duration-200'}`}
    >
      <div className="flex items-start gap-3 p-3.5 pr-10">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${kind.badge}`}>
          <Icon size={19} className={toast.type === 'loading' ? 'animate-spin' : ''} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm leading-tight font-semibold text-slate-900">{t(title)}</p>
          {toast.message && <p className="mt-0.5 text-[13px] leading-snug break-words text-slate-600">{t(toast.message)}</p>}
          {toast.action && (
            <button
              type="button"
              onClick={() => { toast.action.onClick?.(); onDismiss(toast.id); }}
              className="mt-2 inline-flex h-7 cursor-pointer items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              {t(toast.action.label)}
            </button>
          )}
        </div>
      </div>
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label={t('Dismiss')} className="absolute top-2.5 right-2.5 grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
      {toast.duration ? (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-slate-100">
          <span
            key={toast.version}
            className={`block h-full origin-left ${kind.bar} motion-safe:animate-toast-progress`}
            style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          />
        </span>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const dismiss = useCallback((id) => {
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    setTimeout(() => remove(id), 200);
  }, [remove]);

  const show = useCallback((type, message, options = {}) => {
    const text = typeof message === 'string' ? message : message?.message ?? '';
    const duration = options.duration === undefined ? DURATION[type] : options.duration;
    nextId += 1;
    const id = options.id ?? nextId;
    setToasts((items) => {
      // Same message shown twice in a row (double click, repeated error): refresh it instead of stacking.
      const twin = items.find((item) => !item.leaving && item.type === type && item.message === text && (item.title ?? null) === (options.title ?? null));
      if (twin) return items.map((item) => (item.id === twin.id ? { ...item, version: item.version + 1 } : item));
      const next = { id, type, message: text, title: options.title, action: options.action, duration, version: 0 };
      return [...items.filter((item) => !item.leaving).slice(-(MAX_VISIBLE - 1)), next];
    });
    return id;
  }, []);

  const update = useCallback((id, type, message, options = {}) => {
    setToasts((items) => items.map((item) => (item.id === id ? {
      ...item,
      type,
      message: typeof message === 'string' ? message : message?.message ?? item.message,
      title: options.title,
      action: options.action,
      duration: options.duration === undefined ? DURATION[type] : options.duration,
      version: item.version + 1,
    } : item)));
  }, []);

  const value = useMemo(() => {
    const api = {
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      warning: (message, options) => show('warning', message, options),
      info: (message, options) => show('info', message, options),
      loading: (message, options) => show('loading', message, options),
      update,
      dismiss,
      /** Shows "loading", then success or error when the promise settles. Returns the promise. */
      promise(promise, { loading = 'Working…', success = 'Done', error = (failure) => failure?.message || 'Something went wrong' } = {}) {
        nextId += 1;
        const id = `p${nextId}`;
        show('loading', loading, { id });
        promise.then(
          (result) => update(id, 'success', typeof success === 'function' ? success(result) : success),
          (failure) => update(id, 'error', typeof error === 'function' ? error(failure) : error),
        );
        return promise;
      },
    };
    return api;
  }, [show, update, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label={t('Notifications')}
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] font-body sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-[calc(1.25rem+var(--toast-offset,0px))] sm:items-end sm:px-0 sm:pt-0"
      >
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
