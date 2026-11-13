'use client';

import { useState } from 'react';
import { Link } from '@/router';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { Price, ProductImage, SaleBadge, Skel, Stars, StockBadge } from './ui.jsx';
import QuickView from './QuickView.jsx';

export function WishlistButton({ product, className = '' }) {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  return (
    <button
      type="button"
      onClick={(event) => { event.preventDefault(); wishlist.toggle(product); }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-stone-200 transition hover:scale-105 ${saved ? 'text-rose-600' : 'text-stone-600 hover:text-rose-600'} ${className}`}
    >
      <Heart size={18} className={saved ? 'fill-current' : ''} />
    </button>
  );
}

/** Product card: grid (default) or list layout. */
export default function ProductCard({ product, layout = 'grid' }) {
  const cart = useCart();
  const [quickView, setQuickView] = useState(false);
  const href = `/product/${product.slug}`;

  const addButton = (
    <button
      type="button"
      disabled={!product.inStock}
      onClick={() => cart.add(product)}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
    >
      <ShoppingBag size={16} /> {product.inStock ? 'Add to cart' : 'Sold out'}
    </button>
  );

  if (layout === 'list') {
    return (
      <article className="group flex gap-5 rounded-3xl bg-white p-4 ring-1 ring-stone-200/80 transition hover:shadow-lg hover:shadow-emerald-900/5 sm:p-5">
        <Link to={href} className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl bg-stone-100 sm:w-44">
          <ProductImage src={product.thumbnail || product.image} alt={product.name} imgClassName="transition duration-500 group-hover:scale-105" />
          <SaleBadge percentage={product.discountPercentage} className="absolute top-2 left-2" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {product.category && <Link to={`/category/${product.category.slug}`} className="text-xs font-semibold tracking-wide text-emerald-700 uppercase hover:underline">{product.category.name}</Link>}
          <h3 className="mt-1 font-serif text-xl font-semibold text-emerald-950"><Link to={href} className="hover:text-emerald-700">{product.name}</Link></h3>
          {product.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{product.shortDescription}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3"><Stars value={product.ratingAverage} count={product.ratingCount} /><StockBadge product={product} /></div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <Price price={product.price} regularPrice={product.regularPrice} />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQuickView(true)} className="h-10 cursor-pointer rounded-full px-4 text-sm font-semibold text-emerald-900 ring-1 ring-stone-200 hover:bg-stone-50">Quick view</button>
              <WishlistButton product={product} />
              {addButton}
            </div>
          </div>
        </div>
        <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden rounded-3xl bg-stone-100 ring-1 ring-stone-200/60">
        <Link to={href} className="block aspect-[4/5]" aria-label={product.name}>
          <ProductImage src={product.thumbnail || product.image} alt={product.name} imgClassName="transition duration-700 group-hover:scale-105" />
        </Link>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <SaleBadge percentage={product.discountPercentage} />
            {product.isNewArrival && <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white">New</span>}
          </div>
          <WishlistButton product={product} className="pointer-events-auto" />
        </div>
        <div className="absolute inset-x-3 bottom-3 flex gap-2 transition duration-300 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
          <button type="button" onClick={() => setQuickView(true)} className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white/95 text-sm font-semibold text-emerald-950 shadow-sm backdrop-blur hover:bg-white">
            <Eye size={16} /> Quick view
          </button>
          <button type="button" disabled={!product.inStock} onClick={() => cart.add(product)} aria-label={`Add ${product.name} to cart`} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400">
            <ShoppingBag size={17} />
          </button>
        </div>
        {!product.inStock && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-white/85 py-2 text-center text-xs font-bold tracking-widest text-stone-700 uppercase">Sold out</span>}
      </div>
      <div className="mt-4 flex flex-1 flex-col px-1">
        {product.category && <Link to={`/category/${product.category.slug}`} className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase hover:underline">{product.category.name}</Link>}
        <h3 className="mt-1 line-clamp-2 font-semibold text-stone-900"><Link to={href} className="hover:text-emerald-800">{product.name}</Link></h3>
        <div className="mt-1.5 flex items-center gap-2"><Stars value={product.ratingAverage} count={product.ratingCount} size={13} /></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Price price={product.price} regularPrice={product.regularPrice} />
          <StockBadge product={product} />
        </div>
        <div className="mt-3 sm:hidden">{addButton}</div>
      </div>
      <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skel className="aspect-[4/5] w-full rounded-3xl" />
      <Skel className="mt-4 h-3 w-20" />
      <Skel className="mt-2 h-4 w-4/5" />
      <Skel className="mt-2 h-3 w-24" />
      <Skel className="mt-3 h-5 w-28" />
    </div>
  );
}

export function ProductGrid({ products, loading, count = 8, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 ${className}`} aria-busy={loading || undefined}>
      {loading ? Array.from({ length: count }, (_, index) => <ProductCardSkeleton key={index} />) : products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
