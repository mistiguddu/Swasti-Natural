'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { money } from '../../lib/format.js';
import { useCart } from '../context/CartContext.jsx';
import { Skel } from './ui.jsx';

/** Coupon input bound to the cart's coupon code. */
export function CouponField({ quote }) {
  const cart = useCart();
  const [code, setCode] = useState('');
  const applied = cart.couponCode;
  if (applied) {
    const valid = quote?.coupon?.valid;
    return (
      <div className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${valid === false ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-emerald-50 text-emerald-900 ring-emerald-100'}`}>
        <span>
          <span className="inline-flex items-center gap-1.5 font-semibold"><Tag size={15} /> {applied}</span>
          {valid === false && <span className="mt-0.5 block text-xs">{quote.coupon.message}</span>}
          {valid && <span className="mt-0.5 block text-xs">You save {money(quote.coupon.discount)}</span>}
        </span>
        <button type="button" onClick={() => cart.setCouponCode('')} aria-label="Remove coupon" className="cursor-pointer rounded-full p-1 hover:bg-white/60"><X size={15} /></button>
      </div>
    );
  }
  return (
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.trim()) cart.setCouponCode(code.trim().toUpperCase()); setCode(''); }}>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Coupon code" aria-label="Coupon code" className="h-11 min-w-0 flex-1 rounded-full border border-stone-200 px-4 text-sm uppercase outline-none placeholder:normal-case focus:border-emerald-700" />
      <button type="submit" className="h-11 shrink-0 cursor-pointer rounded-full bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800">Apply</button>
    </form>
  );
}

/** Totals block (server quote). */
export function Totals({ quote, loading }) {
  if (!quote) return <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-4 w-full" />)}</div>;
  const t = quote.totals;
  const rows = [
    [`Subtotal (${t.items} item${t.items === 1 ? '' : 's'})`, money(t.subtotal)],
    t.itemDiscount > 0 && ['Discount', `−${money(t.itemDiscount)}`, 'text-emerald-700'],
    t.couponDiscount > 0 && [`Coupon (${quote.coupon.code})`, `−${money(t.couponDiscount)}`, 'text-emerald-700'],
    ['Delivery', quote.shippingMethod ? (t.shipping ? money(t.shipping) : 'Free') : '—'],
    t.tax > 0 && ['Tax', money(t.tax)],
  ].filter(Boolean);
  return (
    <dl className={`space-y-3 text-sm transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading || undefined}>
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex justify-between gap-4"><dt className="text-stone-600">{label}</dt><dd className={`font-medium tabular-nums ${tone ?? 'text-stone-900'}`}>{value}</dd></div>
      ))}
      <div className="flex justify-between gap-4 border-t border-stone-200 pt-4 text-base">
        <dt className="font-semibold text-stone-900">Total</dt><dd className="font-serif text-2xl font-semibold text-emerald-950 tabular-nums">{money(t.grandTotal)}</dd>
      </div>
    </dl>
  );
}
