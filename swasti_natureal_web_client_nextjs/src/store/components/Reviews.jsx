'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from '@/router';
import {
  BadgeCheck, Camera, ChevronLeft, ChevronRight, Flag, ImagePlus, MessageSquareText, Pencil, Star, Store, ThumbsUp, Trash2, X,
} from 'lucide-react';
import { toFormData } from '../../api.js';
import { storeApi } from '../api.js';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { date } from '../../lib/format.js';
import { Skel, btn } from './ui.jsx';

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const RATING_WORDS = { 1: 'Terrible', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const SORTS = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' },
];
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'offensive', label: 'Offensive or abusive' },
  { value: 'irrelevant', label: 'Not about this product' },
  { value: 'fake', label: 'Looks fake' },
  { value: 'other', label: 'Something else' },
];

/* ───────────────────────────── Small pieces ───────────────────────────── */

function StarRow({ value, size = 16, className = '' }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'} />
      ))}
    </span>
  );
}

/** Large, keyboard-friendly star picker with a word for each rating. */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} – ${RATING_WORDS[star]}`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="cursor-pointer rounded-lg p-0.5 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Star size={34} className={star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-stone-100 text-stone-300'} />
          </button>
        ))}
      </div>
      <p className={`mt-1 h-5 text-sm font-semibold ${shown ? 'text-amber-700' : 'text-stone-400'}`}>{shown ? RATING_WORDS[shown] : 'Tap a star to rate'}</p>
    </div>
  );
}

function Avatar({ name }) {
  const letter = (name || 'C').trim().charAt(0).toUpperCase();
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-sm font-bold text-white">{letter}</span>;
}

/** Modal shell used by the review form, report dialog and photo viewer. */
function Sheet({ title, onClose, children, footer, wide = false, dark = false }) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-body text-stone-800 sm:items-center sm:p-6">
      <div className={`absolute inset-0 backdrop-blur-sm motion-safe:animate-fade-in ${dark ? 'bg-black/85' : 'bg-emerald-950/50'}`} onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl ${wide ? 'max-w-3xl' : 'max-w-lg'} ${dark ? 'bg-transparent shadow-none' : 'bg-white'}`}>
        {!dark && (
          <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
            <h2 className="font-serif text-xl font-semibold text-emerald-950">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"><X size={18} /></button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${dark ? '' : 'px-5 py-5'}`}>{children}</div>
        {footer && <div className="border-t border-stone-100 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────────── Photo viewer ───────────────────────────── */

function PhotoViewer({ photos, start, onClose }) {
  const [index, setIndex] = useState(start);
  const go = useCallback((step) => setIndex((current) => (current + step + photos.length) % photos.length), [photos.length]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'ArrowLeft') go(-1); if (event.key === 'ArrowRight') go(1); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);
  return (
    <Sheet title="Review photos" onClose={onClose} wide dark>
      <div className="relative flex h-[80dvh] items-center justify-center p-4">
        <img src={photos[index]} alt={`Photo ${index + 1} of ${photos.length}`} className="max-h-full max-w-full rounded-2xl object-contain" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><X size={20} /></button>
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ChevronLeft size={22} /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ChevronRight size={22} /></button>
            <span className="absolute bottom-4 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white tabular-nums">{index + 1} / {photos.length}</span>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ───────────────────────────── Write / edit ───────────────────────────── */

function ReviewForm({ product, existing, verifiedPurchase, onClose, onSaved }) {
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [kept, setKept] = useState(existing?.images ?? []);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  const photoCount = kept.length + files.length;

  function addFiles(list) {
    const chosen = [...list];
    const rejected = chosen.filter((file) => !/^image\/(jpe?g|png|webp)$/.test(file.type) || file.size > MAX_PHOTO_BYTES);
    if (rejected.length) toast.warning('Use JPG, PNG or WEBP photos up to 5 MB each.', { title: 'Some photos were skipped' });
    const valid = chosen.filter((file) => !rejected.includes(file));
    const room = MAX_PHOTOS - photoCount;
    if (valid.length > room) toast.warning(`You can add up to ${MAX_PHOTOS} photos.`, { title: 'Photo limit' });
    setFiles((current) => [...current, ...valid.slice(0, Math.max(0, room))]);
  }

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!rating) next.rating = 'Choose a star rating';
    if (comment.trim().length < 10) next.comment = 'Please write at least 10 characters';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const fields = { rating, title: title.trim(), comment: comment.trim() };
      const body = existing
        ? toFormData({ ...fields, keepImages: kept }, { images: files })
        : toFormData({ ...fields, product: product.id }, { images: files });
      const saved = existing ? await storeApi.put(`/reviews/mine/${existing.id}`, body) : await storeApi.post('/reviews', body);
      const live = saved.status === 'approved';
      toast.success(live ? 'Your review is now live. Thank you!' : 'Thanks! It will appear once our team approves it.', { title: existing ? 'Review updated' : 'Review submitted' });
      onSaved(saved);
    } catch (error) {
      // Show the server's field problems under the fields instead of a generic "validation failed".
      const fields = {};
      for (const issue of error.details ?? []) {
        const field = String(issue.path ?? '').split('.').pop();
        if (field === 'comment') fields.comment = /10/.test(issue.message) ? 'Please write at least 10 characters' : issue.message;
        else if (field === 'rating') fields.rating = 'Choose a star rating';
        else if (field) fields[field] = issue.message;
      }
      setErrors(fields);
      const first = fields.rating || fields.comment || Object.values(fields)[0];
      toast.error(first ?? error.message, { title: Object.keys(fields).length ? 'Please check your review' : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={existing ? 'Edit your review' : 'Write a review'}
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`${btn.secondary} h-12 flex-1 px-4 text-sm sm:flex-none`}>Cancel</button>
          <button type="submit" form="review-form" disabled={busy} className={`${btn.primary} h-12 flex-1 text-sm`}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Submit review'}</button>
        </div>
      )}
    >
      <form id="review-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200/70">
          {product.image && <img src={product.thumbnail || product.image} alt="" className="h-12 w-12 rounded-xl object-cover" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">{product.name}</p>
            {verifiedPurchase && <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={13} /> Your review will show “Verified purchase”</p>}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-stone-800">Overall rating <span className="text-rose-600">*</span></p>
          <StarPicker value={rating} onChange={(value) => { setRating(value); setErrors((current) => ({ ...current, rating: undefined })); }} />
          {errors.rating && <p className="text-xs font-medium text-rose-600">{errors.rating}</p>}
        </div>

        <label className="block">
          <span className="mb-1.5 flex justify-between text-sm font-semibold text-stone-800">Headline <span className="text-xs font-normal text-stone-400">{title.length}/150</span></span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} placeholder="Sum it up in a few words" className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" />
        </label>

        <label className="block">
          <span className="mb-1.5 flex justify-between text-sm font-semibold text-stone-800"><span>Your review <span className="text-rose-600">*</span></span><span className="text-xs font-normal text-stone-400">{comment.length}/3000</span></span>
          <textarea value={comment} onChange={(event) => { setComment(event.target.value); setErrors((current) => ({ ...current, comment: undefined })); }} maxLength={3000} rows={5} placeholder="What did you like or dislike? How did you use it? Would you recommend it?" aria-invalid={Boolean(errors.comment)} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:ring-4 focus:ring-emerald-700/10 ${errors.comment ? 'border-rose-400 focus:border-rose-500' : 'border-stone-200 focus:border-emerald-700'}`} />
          {errors.comment && <span className="text-xs font-medium text-rose-600">{errors.comment}</span>}
        </label>

        <div>
          <p className="mb-1.5 flex justify-between text-sm font-semibold text-stone-800">Add photos <span className="text-xs font-normal text-stone-400">{photoCount}/{MAX_PHOTOS} · optional</span></p>
          <div className="grid grid-cols-4 gap-2">
            {kept.map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setKept((current) => current.filter((item) => item !== url))} aria-label="Remove photo" className="absolute top-1 right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><X size={14} /></button>
              </div>
            ))}
            {previews.map((preview) => (
              <div key={preview.url} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles((current) => current.filter((file) => file !== preview.file))} aria-label="Remove photo" className="absolute top-1 right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><X size={14} /></button>
              </div>
            ))}
            {photoCount < MAX_PHOTOS && (
              <button type="button" onClick={() => input.current?.click()} className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-stone-300 text-stone-500 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700">
                <span className="flex flex-col items-center gap-1 text-[11px] font-semibold"><ImagePlus size={20} /> Add</span>
              </button>
            )}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
          <p className="mt-1.5 text-xs text-stone-500">JPG, PNG or WEBP, up to 5 MB each.</p>
        </div>

        <p className="rounded-xl bg-emerald-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-900">Please keep it honest and about the product. Reviews are checked by our team before they appear.</p>
      </form>
    </Sheet>
  );
}

function ReportDialog({ review, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await storeApi.post(`/reviews/${review.id}/report`, { reason, details: details.trim() });
      toast.success('Thanks — our team will take a look.', { title: 'Review reported' });
      onDone();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Report this review"
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`${btn.secondary} h-11 flex-1 px-4 text-sm sm:flex-none`}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"><Flag size={15} /> {busy ? 'Sending…' : 'Report'}</button>
        </div>
      )}
    >
      <p className="text-sm text-stone-600">Why are you reporting the review by <span className="font-semibold text-stone-800">{review.author}</span>?</p>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Reason">
        {REPORT_REASONS.map((item) => (
          <label key={item.value} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-sm ring-1 transition ${reason === item.value ? 'bg-rose-50 font-semibold text-rose-900 ring-rose-300' : 'text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>
            <input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} className="accent-rose-600" />
            {item.label}
          </label>
        ))}
      </div>
      <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={300} rows={3} placeholder="Anything else we should know? (optional)" className="mt-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-emerald-700" />
    </Sheet>
  );
}

/* ───────────────────────────── Summary + list ───────────────────────────── */

function Summary({ summary, rating, onRating, onWrite, writeLabel }) {
  const { average, count, distribution } = summary;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 p-5 ring-1 ring-emerald-900/5 sm:p-6 lg:sticky lg:top-32">
      <div className="flex items-center gap-4">
        <p className={`font-serif text-5xl leading-none font-semibold tabular-nums ${count ? 'text-emerald-950' : 'text-stone-300'}`}>{average.toFixed(1)}</p>
        <div>
          <StarRow value={average} size={18} />
          <p className="mt-1 text-sm text-stone-600">{count ? `Based on ${count} review${count === 1 ? '' : 's'}` : 'No reviews yet'}</p>
        </div>
      </div>
      {count > 0 && <ul className="mt-5 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution[star] ?? 0;
          const percent = count ? Math.round((n / count) * 100) : 0;
          const active = rating === star;
          return (
            <li key={star}>
              <button
                type="button"
                disabled={!n}
                onClick={() => onRating(active ? null : star)}
                aria-pressed={active}
                aria-label={`${star} star reviews: ${n}`}
                className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition disabled:cursor-default ${active ? 'bg-amber-100/70' : 'enabled:hover:bg-white'}`}
              >
                <span className="flex w-8 shrink-0 items-center gap-0.5 font-semibold text-stone-700 tabular-nums">{star}<Star size={12} className="fill-amber-400 text-amber-400" /></span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-200/80">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-9 shrink-0 text-right text-xs text-stone-500 tabular-nums">{percent}%</span>
              </button>
            </li>
          );
        })}
      </ul>}
      <div className="mt-5 border-t border-emerald-900/10 pt-5">
        <p className="text-sm font-semibold text-stone-900">Share your thoughts</p>
        <p className="mt-0.5 text-sm text-stone-600">Help other shoppers by reviewing this product.</p>
        <button type="button" onClick={onWrite} className={`${btn.primary} mt-3 h-11 w-full text-sm`}><Pencil size={15} /> {writeLabel}</button>
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  pending: { label: 'Awaiting approval', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Published', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Not published', className: 'bg-rose-100 text-rose-700' },
};

function ReviewCard({ review, own = false, onHelpful, onReport, onEdit, onDelete, onPhoto }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.comment?.length ?? 0) > 320;
  const status = own && STATUS_BADGE[review.status];
  return (
    <article className={`rounded-2xl p-5 ring-1 ${own ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-white ring-stone-200/70'}`}>
      <header className="flex items-start gap-3">
        <Avatar name={review.author} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-stone-900">{own ? 'Your review' : review.author}</span>
            {review.verifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"><BadgeCheck size={12} /> Verified purchase</span>}
            {status && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
            <StarRow value={review.rating} size={14} />
            <span>{date(review.createdAt)}</span>
            {review.editedAt && <span>· edited</span>}
          </p>
        </div>
      </header>
      {review.title && <h4 className="mt-3 font-semibold text-stone-900">{review.title}</h4>}
      {review.comment && (
        <p className={`mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-stone-700 ${long && !expanded ? 'line-clamp-4' : ''}`}>{review.comment}</p>
      )}
      {long && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 cursor-pointer text-sm font-semibold text-emerald-800 hover:underline">{expanded ? 'Show less' : 'Read more'}</button>}
      {review.images?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.images.map((url, index) => (
            <button key={url} type="button" onClick={() => onPhoto(review.images, index)} aria-label={`Open photo ${index + 1}`} className="h-20 w-20 cursor-zoom-in overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200 transition hover:ring-emerald-400">
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {review.adminReply && (
        <div className="mt-4 rounded-xl border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-emerald-800 uppercase"><Store size={13} /> Response from the store {review.adminReplyAt && <span className="font-medium tracking-normal text-emerald-700/70 normal-case">· {date(review.adminReplyAt)}</span>}</p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-emerald-950">{review.adminReply}</p>
        </div>
      )}
      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {own ? (
          <>
            <button type="button" onClick={onEdit} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-white"><Pencil size={14} /> Edit</button>
            <button type="button" onClick={onDelete} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
            {review.status === 'pending' && <span className="text-xs text-stone-500">Only you can see it until it’s approved.</span>}
          </>
        ) : (
          <>
            <span className="mr-1 text-xs text-stone-500">Helpful?</span>
            <button type="button" onClick={onHelpful} aria-pressed={review.helpful} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition active:scale-95 ${review.helpful ? 'bg-emerald-700 text-white ring-emerald-700' : 'text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>
              <ThumbsUp size={14} className={review.helpful ? 'fill-current' : ''} /> Yes{review.helpfulCount > 0 && <span className="tabular-nums">· {review.helpfulCount}</span>}
            </button>
            <button type="button" onClick={onReport} className="ml-auto inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-rose-700"><Flag size={13} /> Report</button>
          </>
        )}
      </footer>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl p-5 ring-1 ring-stone-200/70">
          <div className="flex gap-3"><Skel className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skel className="h-4 w-40" /><Skel className="h-3 w-28" /></div></div>
          <Skel className="mt-4 h-4 w-2/3" /><Skel className="mt-2 h-3 w-full" /><Skel className="mt-1.5 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── Main section ───────────────────────────── */

/** Product reviews: summary, filters, sorting, photos, helpful votes, reports, and the customer's own review. */
export default function Reviews({ product, onCountChange }) {
  const { isSignedIn } = useCustomer();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sort, setSort] = useState('helpful');
  const [rating, setRating] = useState(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], pagination: null, summary: null });
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind: 'form' | 'report' | 'photos' | 'delete', ... }
  const [version, setVersion] = useState(0);
  const reload = () => { setPage(1); setVersion((value) => value + 1); };

  // Reviews list (+ summary). Page 1 replaces the list; later pages append.
  useEffect(() => {
    let active = true;
    setLoading(true);
    storeApi.get(`/store/products/${product.id}/reviews`, { page, limit: 6, sort, rating: rating ?? undefined, withPhotos: withPhotos || undefined })
      .then((data) => {
        if (!active) return;
        setList((current) => ({ ...data, items: page === 1 ? data.items : [...current.items, ...data.items] }));
        onCountChange?.(data.summary.count);
      })
      .catch((error) => active && toast.error(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [product.id, page, sort, rating, withPhotos, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // The signed-in customer's own review (shown even while awaiting approval).
  useEffect(() => {
    if (!isSignedIn) { setMine(null); return undefined; }
    let active = true;
    storeApi.get(`/reviews/mine/${product.id}`).then((data) => active && setMine(data)).catch(() => {});
    return () => { active = false; };
  }, [isSignedIn, product.id, version]);

  const changeFilter = (apply) => { apply(); setPage(1); };
  const requireSignIn = (message) => {
    toast.info(message, { title: 'Please sign in', action: { label: 'Sign in', onClick: () => navigate(`/login?next=${encodeURIComponent(location.pathname)}`) } });
  };
  const write = () => {
    // Guests go straight to sign-in and come back to this product's reviews afterwards.
    if (!isSignedIn) { navigate(`/login?next=${encodeURIComponent(`${location.pathname}#reviews`)}`); return; }
    setDialog({ kind: 'form', existing: mine?.review ?? null });
  };

  async function helpful(review) {
    if (!isSignedIn) { requireSignIn('Sign in to vote on reviews.'); return; }
    const patch = (changes) => setList((current) => ({ ...current, items: current.items.map((item) => (item.id === review.id ? { ...item, ...changes } : item)) }));
    patch({ helpful: !review.helpful, helpfulCount: review.helpfulCount + (review.helpful ? -1 : 1) });
    try {
      patch(await storeApi.post(`/reviews/${review.id}/helpful`));
    } catch (error) {
      patch({ helpful: review.helpful, helpfulCount: review.helpfulCount });
      toast.error(error.message);
    }
  }

  async function removeMine() {
    try {
      await storeApi.delete(`/reviews/mine/${mine.review.id}`);
      toast.success('Your review has been removed.', { title: 'Review deleted' });
      setDialog(null);
      reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const summary = list.summary ?? { average: product.ratingAverage ?? 0, count: product.ratingCount ?? 0, distribution: {}, withPhotos: 0 };
  const others = list.items.filter((item) => !item.mine);
  const filtered = Boolean(rating || withPhotos);
  const writeLabel = mine?.review ? 'Edit your review' : 'Write a review';

  return (
    <div id="reviews" className="grid scroll-mt-32 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      <div>
        <Summary summary={summary} rating={rating} onRating={(value) => changeFilter(() => setRating(value))} onWrite={write} writeLabel={writeLabel} />
      </div>

      <div className="min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => changeFilter(() => { setRating(null); setWithPhotos(false); })} className={`h-9 cursor-pointer rounded-full px-3.5 text-sm font-semibold ring-1 transition ${!filtered ? 'bg-emerald-800 text-white ring-emerald-800' : 'text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>All</button>
          {summary.withPhotos > 0 && (
            <button type="button" onClick={() => changeFilter(() => setWithPhotos((value) => !value))} aria-pressed={withPhotos} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition ${withPhotos ? 'bg-emerald-800 text-white ring-emerald-800' : 'text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>
              <Camera size={14} /> With photos <span className="tabular-nums opacity-70">{summary.withPhotos}</span>
            </button>
          )}
          {rating && (
            <button type="button" onClick={() => changeFilter(() => setRating(null))} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-amber-100 px-3.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              {rating} <Star size={13} className="fill-amber-500 text-amber-500" /> only <X size={14} />
            </button>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm text-stone-600">
            <span className="hidden sm:inline">Sort by</span>
            <select value={sort} onChange={(event) => changeFilter(() => setSort(event.target.value))} className="h-9 cursor-pointer rounded-full border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 outline-none focus:border-emerald-700">
              {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-4">
          {/* The customer's own review first, whatever its status */}
          {mine?.review && !filtered && (
            <ReviewCard
              review={mine.review}
              own
              onEdit={() => setDialog({ kind: 'form', existing: mine.review })}
              onDelete={() => setDialog({ kind: 'delete' })}
              onPhoto={(photos, start) => setDialog({ kind: 'photos', photos, start })}
            />
          )}

          {loading && page === 1 ? <ListSkeleton /> : others.length === 0 ? (
            !mine?.review && (
              <div className="rounded-3xl border-2 border-dashed border-stone-200 px-6 py-12 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><MessageSquareText size={24} /></span>
                <p className="mt-4 font-serif text-xl font-semibold text-emerald-950">{filtered ? 'No reviews match these filters' : 'No reviews yet'}</p>
                <p className="mt-1 text-sm text-stone-600">{filtered ? 'Try another filter.' : 'Be the first to share your experience with this product.'}</p>
                {filtered
                  ? <button type="button" onClick={() => changeFilter(() => { setRating(null); setWithPhotos(false); })} className={`${btn.secondary} mt-5 h-11 text-sm`}>Clear filters</button>
                  : <button type="button" onClick={write} className={`${btn.primary} mt-5 h-11 text-sm`}><Pencil size={15} /> Write a review</button>}
              </div>
            )
          ) : (
            others.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onHelpful={() => helpful(review)}
                onReport={() => (isSignedIn ? setDialog({ kind: 'report', review }) : requireSignIn('Sign in to report a review.'))}
                onPhoto={(photos, start) => setDialog({ kind: 'photos', photos, start })}
              />
            ))
          )}
        </div>

        {list.pagination?.hasNextPage && (
          <div className="mt-6 text-center">
            <button type="button" disabled={loading} onClick={() => setPage((value) => value + 1)} className={`${btn.secondary} h-11 px-6 text-sm`}>{loading ? 'Loading…' : `Show more reviews (${list.pagination.total - list.items.length} more)`}</button>
          </div>
        )}
      </div>

      {dialog?.kind === 'form' && (
        <ReviewForm
          product={product}
          existing={dialog.existing}
          verifiedPurchase={mine?.verifiedPurchase}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); reload(); }}
        />
      )}
      {dialog?.kind === 'report' && <ReportDialog review={dialog.review} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />}
      {dialog?.kind === 'photos' && <PhotoViewer photos={dialog.photos} start={dialog.start} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <Sheet
          title="Delete your review?"
          onClose={() => setDialog(null)}
          footer={(
            <div className="flex gap-2">
              <button type="button" onClick={() => setDialog(null)} className={`${btn.secondary} h-11 flex-1 px-4 text-sm sm:flex-none`}>Keep it</button>
              <button type="button" onClick={removeMine} className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white hover:bg-rose-700"><Trash2 size={15} /> Delete review</button>
            </div>
          )}
        >
          <p className="text-sm text-stone-600">Your rating, text and photos will be removed. You can write a new review later.</p>
        </Sheet>
      )}
    </div>
  );
}
