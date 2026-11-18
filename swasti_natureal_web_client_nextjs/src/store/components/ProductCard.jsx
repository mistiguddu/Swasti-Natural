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
      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
    >
      <ShoppingBag size={16} /> {product.inStock ? 'Add to cart' : 'Sold out'}
    </button>
  );

  if (layout === 'list') {
    return (
      <article className="group flex gap-3 rounded-3xl bg-white p-3 ring-1 ring-stone-200/80 transition hover:shadow-lg hover:shadow-emerald-900/5 sm:gap-5 sm:p-5">
        <Link to={href} className="relative aspect-square w-28 shrink-0 self-start overflow-hidden rounded-2xl bg-stone-100 sm:w-44">
          <ProductImage src={product.thumbnail || product.image} alt={product.name} imgClassName="transition duration-500 group-hover:scale-105" />
          <SaleBadge percentage={product.discountPercentage} className="absolute top-2 left-2" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {product.category && <Link to={`/category/${product.category.slug}`} className="text-xs font-semibold tracking-wide text-emerald-700 uppercase hover:underline">{product.category.name}</Link>}
          <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-snug font-semibold text-emerald-950 sm:text-xl"><Link to={href} className="hover:text-emerald-700">{product.name}</Link></h3>
          {product.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{product.shortDescription}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><Stars value={product.ratingAverage} count={product.ratingCount} /><StockBadge product={product} /></div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 sm:pt-4">
            <Price price={product.price} regularPrice={product.regularPrice} />
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button type="button" onClick={() => setQuickView(true)} aria-label={`Quick view ${product.name}`} className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap text-emerald-900 ring-1 ring-stone-200 hover:bg-stone-50 sm:w-auto sm:px-4"><Eye size={16} className="shrink-0" /><span className="hidden sm:inline">Quick view</span></button>
              <WishlistButton product={product} />
              <div className="min-w-0 flex-1 sm:flex-none [&>button]:w-full">{addButton}</div>
            </div>
          </div>
        </div>
        <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
      </article>
    );
  }

  /*
   * Responsive by the card's own width (@container), not the screen, so it works in 2-, 3- and
   * 4-column grids, sliders and any phone/tablet/desktop size:
   *  - Mouse devices (can-hover): Quick view + cart slide up over the image on hover.
   *  - Touch devices: a round Quick view icon sits on the image and a full-width
   *    "Add to cart" button sits under the price. Labels shorten on very narrow cards
   *    and never wrap.
   */
  return (
    <article className="group @container flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/60 @[13rem]:rounded-3xl">
        <Link to={href} className="block aspect-[4/5]" aria-label={product.name}>
          <ProductImage src={product.thumbnail || product.image} alt={product.name} imgClassName="transition duration-700 group-hover:scale-105" />
        </Link>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between @[13rem]:inset-x-3 @[13rem]:top-3">
          <div className="flex flex-col items-start gap-1.5">
            <SaleBadge percentage={product.discountPercentage} />
            {product.isNewArrival && <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white">New</span>}
          </div>
          <WishlistButton product={product} className="pointer-events-auto h-9! w-9! @[13rem]:h-10! @[13rem]:w-10!" />
        </div>

        {/* Mouse: hover overlay */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 gap-2 opacity-0 transition duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 can-hover:flex">
          <button type="button" onClick={() => setQuickView(true)} aria-label={`Quick view ${product.name}`} className="inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-semibold whitespace-nowrap text-emerald-950 shadow-sm backdrop-blur hover:bg-white">
            <Eye size={16} className="shrink-0" /> <span className="hidden truncate @[11rem]:inline">Quick view</span>
          </button>
          <button type="button" disabled={!product.inStock} onClick={() => cart.add(product)} aria-label={`Add ${product.name} to cart`} className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400">
            <ShoppingBag size={17} />
          </button>
        </div>

        {/* Touch: always-visible Quick view icon */}
        <button type="button" onClick={() => setQuickView(true)} aria-label={`Quick view ${product.name}`} className="absolute right-2 bottom-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/95 text-emerald-900 shadow-md ring-1 ring-stone-200/70 backdrop-blur transition active:scale-90 can-hover:hidden @[13rem]:right-3 @[13rem]:bottom-3">
          <Eye size={17} />
        </button>

        {!product.inStock && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-white/85 py-2 text-center text-[11px] font-bold tracking-widest text-stone-700 uppercase">Sold out</span>}
      </div>

      <div className="mt-3 flex flex-1 flex-col px-0.5 @[13rem]:mt-4 @[13rem]:px-1">
        {product.category && <Link to={`/category/${product.category.slug}`} className="truncate text-[10.5px] font-semibold tracking-wider text-emerald-700 uppercase hover:underline @[13rem]:text-[11px]">{product.category.name}</Link>}
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-stone-900 @[13rem]:text-base"><Link to={href} className="hover:text-emerald-800">{product.name}</Link></h3>
        <div className="mt-1.5 flex items-center gap-2"><Stars value={product.ratingAverage} count={product.ratingCount} size={12} /></div>
        <div className="mt-2 flex flex-col items-start gap-1 @[13rem]:flex-row @[13rem]:flex-wrap @[13rem]:items-center @[13rem]:justify-between @[13rem]:gap-2">
          <Price price={product.price} regularPrice={product.regularPrice} className="[&>span:first-child]:text-base @[13rem]:[&>span:first-child]:text-lg [&>span:nth-child(2)]:text-xs @[13rem]:[&>span:nth-child(2)]:text-sm" />
          <StockBadge product={product} className="text-[11px] @[13rem]:text-xs" />
        </div>

        {/* Touch: full-width add to cart, pinned to the bottom so buttons line up across a row */}
        <div className="mt-auto pt-3 can-hover:hidden">
          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => cart.add(product)}
            aria-label={product.inStock ? `Add ${product.name} to cart` : `${product.name} is sold out`}
            className="inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-emerald-800 px-3 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none @[13rem]:h-11 @[13rem]:text-sm"
          >
            <ShoppingBag size={16} className="shrink-0" />
            {product.inStock
              ? <><span className="@[9.5rem]:hidden">Add</span><span className="hidden @[9.5rem]:inline">Add to cart</span></>
              : 'Sold out'}
          </button>
        </div>
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
    <div className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 ${className}`} aria-busy={loading || undefined}>
      {loading ? Array.from({ length: count }, (_, index) => <ProductCardSkeleton key={index} />) : products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
