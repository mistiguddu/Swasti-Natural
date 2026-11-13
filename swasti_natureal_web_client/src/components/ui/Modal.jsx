import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button, IconButton } from './Button.jsx';

function useDialog(open, onClose) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panel.current?.querySelector('[data-autofocus], input, select, textarea, button')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);
  return panel;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panel = useDialog(open, onClose);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${width} motion-safe:animate-fade-up`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div ref={panel} role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl motion-safe:animate-fade-up">
        <div className="flex gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle size={20} /></span>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">{title}</h2>
            {message && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} busy={busy} busyLabel="Please wait…" data-autofocus>{confirmLabel}</Button>
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative flex h-full w-full flex-col bg-white shadow-2xl ${width} motion-safe:animate-slide-in`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
