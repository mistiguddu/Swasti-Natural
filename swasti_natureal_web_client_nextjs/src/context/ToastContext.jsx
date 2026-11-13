'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { t } from '../i18n/index.js';

const ToastContext = createContext(null);
let nextId = 0; // crypto.randomUUID() is unavailable on plain-http LAN addresses
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const STYLES = {
  success: 'border-emerald-200 bg-surface text-slate-800 [&_svg.icon]:text-emerald-600',
  error: 'border-rose-200 bg-surface text-slate-800 [&_svg.icon]:text-rose-600',
  info: 'border-sky-200 bg-surface text-slate-800 [&_svg.icon]:text-sky-600',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((items) => items.filter((toast) => toast.id !== id)), []);
  const push = useCallback((type, message) => {
    nextId += 1;
    const id = nextId;
    setToasts((items) => [...items.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 motion-safe:animate-fade-up ${STYLES[toast.type]}`}>
              <Icon size={18} className="icon mt-0.5 shrink-0" />
              <p className="flex-1 leading-snug">{t(toast.message)}</p>
              <button onClick={() => dismiss(toast.id)} className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
