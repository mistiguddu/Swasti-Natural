'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/router';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { storeApi } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { Price, ProductImage, QuantityStepper, SaleBadge, Skel, Stars, StockBadge } from './ui.jsx';
import { WishlistButton } from './ProductCard.jsx';

/** Quick view: loads full product details (incl. gallery) in a modal. */
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
    document.body.style.overflow = 'hidden';
    return () => { active = false; document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, product, onClose]);

  if (!open) return null;
  const item = details ?? product;
  const images = [item.image, item.thumbnail, ...(item.gallery ?? [])].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index);
  const shown = image ?? images[0];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={`Quick view: ${item.name}`} className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl md:grid-cols-2 motion-safe:animate-fade-up">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/95 text-stone-700 shadow ring-1 ring-stone-200 hover:bg-stone-50"><X size={18} /></button>
        <div className="bg-stone-50 p-4 sm:p-6">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
            <ProductImage src={shown} alt={item.name} />
            <SaleBadge percentage={item.discountPercentage} className="absolute top-3 left-3" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((url) => (
                <button key={url} type="button" onClick={() => setImage(url)} aria-label="Show image" className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-2 ${url === shown ? 'ring-emerald-700' : 'ring-transparent'}`}><img src={url} alt="" className="h-full w-full object-cover" /></button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          {item.category && <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">{item.category.name}</p>}
          <h2 className="mt-2 pr-10 font-serif text-2xl font-semibold text-emerald-950">{item.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3"><Stars value={item.ratingAverage} count={item.ratingCount} /><StockBadge product={item} /></div>
          <Price price={item.price} regularPrice={item.regularPrice} size="lg" className="mt-4" />
          {details ? (item.shortDescription && <p className="mt-4 text-sm leading-relaxed text-stone-600">{item.shortDescription}</p>) : <div className="mt-4 space-y-2"><Skel className="h-3 w-full" /><Skel className="h-3 w-4/5" /></div>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} max={item.availableQuantity ?? 99} />
            <button type="button" disabled={!item.inStock} onClick={() => { if (cart.add(item, quantity)) onClose(); }} className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300">
              <ShoppingBag size={18} /> {item.inStock ? 'Add to cart' : 'Sold out'}
            </button>
            <WishlistButton product={item} className="h-12 w-12" />
          </div>
          <Link to={`/product/${item.slug}`} onClick={onClose} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">View full details <ArrowRight size={15} /></Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
