'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button, IconButton } from './Button.jsx';
import { t } from '../../i18n/index.js';

function useDialog(open, onClose) {
  const panel = useRef(null);
  // Keep the latest onClose in a ref: callers pass inline functions, and depending on them
  // re-ran this effect on every keystroke, moving focus out of the dialog's inputs (and
  // closing the phone keyboard) after each character.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Prefer the field marked data-autofocus; otherwise the first field, then the first button.
    requestAnimationFrame(() => {
      const root = panel.current;
      (root?.querySelector('[data-autofocus]') ?? root?.querySelector('input, select, textarea') ?? root?.querySelector('button'))?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);
  return panel;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panel = useDialog(open, onClose);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl ${width} motion-safe:animate-fade-up`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-900">{t(title)}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{t(description)}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 max-sm:[&>*]:flex-1">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmationModal({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', tone = 'danger', busy }) {
  const panel = useDialog(open, busy ? undefined : onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div ref={panel} role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl motion-safe:animate-fade-up sm:p-6">
        <div className="flex gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle size={20} /></span>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">{t(title)}</h2>
            {message && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t(message)}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end max-sm:[&>*]:w-full">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('Cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} busy={busy} busyLabel="Please wait…" data-autofocus>{t(confirmLabel)}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Right-hand slide-over panel for details and quick forms. */
export function DetailsDrawer({ open, onClose, title, description, children, footer, width = 'max-w-xl' }) {
  const panel = useDialog(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative flex h-dvh w-full flex-col bg-surface shadow-2xl ${width} motion-safe:animate-slide-in`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{t(title)}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{t(description)}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
