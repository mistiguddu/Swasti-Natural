'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { digits, t } from '../../i18n/index.js';

export const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

function validate(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) return 'Only JPG, JPEG, PNG and WEBP images are allowed';
  if (file.size > MAX_BYTES) return 'Each image must be 5 MB or smaller';
  return null;
}

function usePreview(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}

/**
 * Single image field. `existing` is the saved URL; `file` the new upload; `removed` marks deletion.
 * onChange({ file, removed })
 */
export function ImageUploader({ label, hint, existing, file, removed, onChange, aspect = 'aspect-[4/3]', error: externalError, fit = 'cover' }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const preview = usePreview(file);
  const src = preview ?? (!removed ? existing : null);

  const pick = (selected) => {
    if (!selected) return;
    const problem = validate(selected);
    setError(problem ?? '');
    if (!problem) onChange({ file: selected, removed: false });
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-semibold text-slate-700">{t(label)}</p>}
      <input ref={input} type="file" accept={ACCEPTED} className="sr-only" tabIndex={-1} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
      {src ? (
        <div className={`group relative overflow-hidden rounded-xl ring-1 ring-slate-200 ${aspect} ${fit === 'contain' ? 'bg-white bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]' : 'bg-slate-50'}`}>
          <img src={src} alt={label ?? 'Preview'} className={`h-full w-full ${fit === 'contain' ? 'object-contain p-4' : 'object-cover'}`} />
          {file && <span className="absolute top-2 left-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">NEW</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-slate-900/60 to-transparent p-2.5">
            <button type="button" onClick={() => input.current?.click()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#334155] shadow hover:bg-white"><RefreshCw size={13} /> {t('Replace')}</button>
            <button type="button" onClick={() => onChange({ file: null, removed: true })} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow hover:bg-surface"><Trash2 size={13} /> {t('Remove')}</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files?.[0]); }}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition ${aspect} ${dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-teal-50/40'}`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-teal-600 shadow-sm ring-1 ring-slate-200"><UploadCloud size={20} /></span>
          <span className="text-sm font-semibold text-slate-700">{t('Click or drop an image')}</span>
          <span className="text-xs text-slate-400">{t('JPG, PNG or WEBP · max 5 MB')}</span>
        </button>
      )}
      {(error || externalError) ? <p className="mt-1.5 text-xs text-rose-600">{t(error || externalError)}</p> : hint && <p className="mt-1.5 text-xs text-slate-400">{t(hint)}</p>}
    </div>
  );
}

function FileThumb({ file, onRemove }) {
  const url = usePreview(file);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200">
      <img src={url} alt={file.name} className="h-full w-full object-cover" />
      <span className="absolute top-1.5 left-1.5 rounded-full bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="absolute top-1.5 right-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-white/95 text-rose-600 shadow sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>
    </div>
  );
}

/** Gallery field: keeps a list of existing URLs plus new files. onChange({ existing, files }) */
export function MultiImageUploader({ label, hint, existing = [], files = [], onChange, max = 20 }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const count = existing.length + files.length;

  const add = (list) => {
    const accepted = [];
    let problem = '';
    for (const file of Array.from(list ?? [])) {
      const issue = validate(file);
      if (issue) problem = `${file.name}: ${issue}`;
      else accepted.push(file);
    }
    const room = max - count;
    if (accepted.length > room) problem = `You can add up to ${max} images`;
    setError(problem);
    if (accepted.length && room > 0) onChange({ existing, files: [...files, ...accepted.slice(0, room)] });
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-semibold text-slate-700">{t(label)} <span className="font-normal text-slate-400">({digits(count)}/{digits(max)})</span></p>}
      <input ref={input} type="file" accept={ACCEPTED} multiple className="sr-only" tabIndex={-1} onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {existing.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange({ existing: existing.filter((item) => item !== url), files })} aria-label="Remove image" className="absolute top-1.5 right-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-white/95 text-rose-600 shadow sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>
          </div>
        ))}
        {files.map((file, index) => <FileThumb key={`${file.name}-${index}`} file={file} onRemove={() => onChange({ existing, files: files.filter((_, i) => i !== index) })} />)}
        {count < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.files); }}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-slate-500 transition hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-700"
          >
            <ImagePlus size={20} />
            <span className="text-xs font-semibold">{t('Add images')}</span>
          </button>
        )}
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-600">{t(error)}</p> : hint && <p className="mt-1.5 text-xs text-slate-400">{t(hint)}</p>}
    </div>
  );
}
