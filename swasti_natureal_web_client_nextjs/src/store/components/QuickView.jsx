'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/router';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { storeApi } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../../lib/format.js';
import { Price, ProductImage, QuantityStepper, SaleBadge, Skel, Stars, StockBadge } from './ui.jsx';
import { WishlistButton } from './ProductCard.jsx';

/**
 * Quick view: loads full product details (incl. gallery) in a modal.
 *
 * Layout (one grid, two shapes):
 *  - Phones: a bottom sheet. Image + details scroll together; the action bar
 *    (quantity, Add to cart) stays pinned at the bottom, above the home bar.
 *  - Tablet/desktop (md+): two columns. Gallery on the left; details scroll on the right
 *    with the action bar pinned under them.
 */
export default function QuickView({ product, open, onClose }) {
  const cart = useCart();
  const [details, setDetails] = useState(null);
  const [image, setImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return undefined;
    setQuantity(1);
    setImage(null);
    let active = true;
    storeApi.get(`/store/products/${product.slug}`).then((data) => active && setDetails(data)).catch(() => active && setDetails(product));
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => { active = false; document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [open, product, onClose]);

  if (!open) return null;
  const item = details ?? product;
  const images = [item.image, item.thumbnail, ...(item.gallery ?? [])].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index);
  const shown = image ?? images[0];
  const total = (Number(item.price) || 0) * quantity;

  return createPortal(
    // Portalled to <body>, so the storefront font and colours are set here.
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-body text-stone-800 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-sm motion-safe:animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${item.name}`}
        className="relative grid max-h-[92dvh] w-full max-w-4xl grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-t-3xl bg-white shadow-2xl motion-safe:animate-fade-up sm:max-h-[min(88dvh,720px)] sm:rounded-3xl md:grid-cols-2"
      >
        {/* Grab handle (phones) */}
        <span aria-hidden="true" className="absolute top-2 left-1/2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-stone-300/90 sm:hidden" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/95 text-stone-700 shadow ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-90 sm:top-4 sm:right-4"><X size={18} /></button>

        {/* Phones: one scroll area for image + details. md+: `contents`, so both become grid cells. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain md:contents">
          <div className="bg-stone-50 p-3 pt-5 sm:p-6 md:col-start-1 md:row-span-2 md:row-start-1 md:min-h-0 md:overflow-y-auto">
            <div className="relative mx-auto aspect-square max-h-[38dvh] overflow-hidden rounded-2xl bg-white sm:max-h-[48dvh] md:max-h-none">
              <ProductImage src={shown} alt={item.name} />
              <SaleBadge percentage={item.discountPercentage} className="absolute top-3 left-3" />
              <WishlistButton product={item} className="absolute right-3 bottom-3 h-11! w-11! shadow-md" />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:justify-start">
                {images.map((url) => (
                  <button key={url} type="button" onClick={() => setImage(url)} aria-label="Show image" aria-pressed={url === shown} className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white ring-2 transition sm:h-16 sm:w-16 ${url === shown ? 'ring-emerald-700' : 'ring-transparent hover:ring-stone-300'}`}><img src={url} alt="" className="h-full w-full object-cover" /></button>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7 md:col-start-2 md:row-start-1 md:min-h-0 md:overflow-y-auto">
            {item.category && <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase sm:text-xs">{item.category.name}</p>}
            <h2 className="mt-1.5 pr-10 font-serif text-xl leading-snug font-semibold text-emerald-950 sm:text-2xl">{item.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><Stars value={item.ratingAverage} count={item.ratingCount} /><StockBadge product={item} /></div>
            <Price price={item.price} regularPrice={item.regularPrice} size="lg" className="mt-3 [&>span:first-child]:text-2xl sm:[&>span:first-child]:text-3xl" />
            {details
              ? (item.shortDescription && <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.shortDescription}</p>)
              : <div className="mt-3 space-y-2"><Skel className="h-3 w-full" /><Skel className="h-3 w-4/5" /></div>}
            <Link to={`/product/${item.slug}`} onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">View full details <ArrowRight size={15} /></Link>
          </div>
        </div>

        {/* Action bar: always visible */}
        <div className="@container border-t border-stone-100 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-5 sm:py-4 md:col-start-2 md:row-start-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} max={item.availableQuantity ?? 99} />
            <button
              type="button"
              disabled={!item.inStock}
              onClick={() => { if (cart.add(item, quantity)) onClose(); }}
              className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-sm font-semibold whitespace-nowrap text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none sm:text-base"
            >
              <ShoppingBag size={18} className="shrink-0" />
              {item.inStock
                ? <><span className="truncate">Add to cart</span><span className="hidden font-medium text-emerald-100 tabular-nums @[22rem]:inline">· {money(total)}</span></>
                : 'Sold out'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
