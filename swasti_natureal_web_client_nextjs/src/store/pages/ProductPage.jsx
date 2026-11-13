'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from '@/router';
import { Banknote, Check, Heart, PackageX, Share2, ShoppingBag, Star, Truck, Zap } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { date, money } from '../../lib/format.js';
import { ProductGrid } from '../components/ProductCard.jsx';
import { Container, EmptyBlock, Price, ProductImage, QuantityStepper, SaleBadge, SectionHeading, Skel, Stars, StockBadge, btn } from '../components/ui.jsx';
import { recentlyViewed, rememberViewed, usePageMeta } from '../lib/helpers.js';

function Gallery({ product }) {
  const images = useMemo(() => [product.image, product.thumbnail, ...(product.gallery ?? [])].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index), [product]);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  useEffect(() => setActive(0), [product.id]);
  const src = images[active];

  return (
    <div className="lg:sticky lg:top-32 lg:self-start">
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl bg-stone-100 ring-1 ring-stone-200/70"
        onMouseMove={(event) => {
          if (!src) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setZoom({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <ProductImage src={src} alt={product.name} />
        {zoom && src && <div aria-hidden="true" className="absolute inset-0 hidden bg-white bg-no-repeat sm:block" style={{ backgroundImage: `url("${src}")`, backgroundSize: '220%', backgroundPosition: `${zoom.x}% ${zoom.y}%` }} />}
        <SaleBadge percentage={product.discountPercentage} className="absolute top-4 left-4 text-sm" />
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <button key={url} type="button" onClick={() => setActive(index)} aria-label={`Image ${index + 1}`} aria-current={index === active} className={`h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl ring-2 transition ${index === active ? 'ring-emerald-700' : 'ring-transparent hover:ring-stone-300'}`}>
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ product, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!rating) { toast.error('Please choose a star rating'); return; }
    setBusy(true);
    try {
      const review = await storeApi.post('/reviews', { product: product.id, rating, title, comment });
      toast.success(review.status === 'approved' ? 'Thanks for your review!' : 'Thanks! Your review will appear once it’s approved.');
      onDone(review);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="rounded-3xl bg-stone-50 p-6 ring-1 ring-stone-200/70">
      <h3 className="font-serif text-xl font-semibold text-emerald-950">Write a review</h3>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`} onClick={() => setRating(star)} className="cursor-pointer p-0.5">
            <Star size={26} className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 hover:text-amber-300'} />
          </button>
        ))}
      </div>
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} placeholder="Title (optional)" aria-label="Review title" className="mt-4 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-emerald-700" />
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={3000} rows={4} placeholder="What did you like or dislike?" aria-label="Review" className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700" />
      <button type="submit" disabled={busy} className={`${btn.primary} mt-4 h-11 text-sm`}>{busy ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}

function Reviews({ product }) {
  const { isSignedIn } = useCustomer();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const { data, loading } = useApi(() => storeApi.get(`/store/products/${product.id}/reviews`, { page, limit: 5 }), [product.id, page]);
  useEffect(() => { if (data) setItems((current) => (page === 1 ? data.items : [...current, ...data.items])); }, [data, page]);
  const breakdown = product.ratingBreakdown ?? {};
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div>
        <p className="font-serif text-5xl font-semibold text-emerald-950">{product.ratingAverage ? product.ratingAverage.toFixed(1) : '—'}</p>
        <Stars value={product.ratingAverage} className="mt-2" size={18} />
        <p className="mt-1 text-sm text-stone-500">{product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</p>
        <ul className="mt-5 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <li key={star} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-stone-600">{star}★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${total ? (breakdown[star] / total) * 100 : 0}%` }} /></span>
              <span className="w-6 text-right text-stone-500 tabular-nums">{breakdown[star] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-6">
        {isSignedIn ? (!submitted && <ReviewForm product={product} onDone={() => setSubmitted(true)} />) : (
          <p className="rounded-2xl bg-stone-50 px-5 py-4 text-sm text-stone-700 ring-1 ring-stone-200/70"><Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="font-semibold text-emerald-800 underline">Sign in</Link> to write a review.</p>
        )}
        {loading && page === 1 ? <div className="space-y-4">{[0, 1].map((i) => <Skel key={i} className="h-24 rounded-2xl" />)}</div> : !items.length ? (
          <p className="text-stone-600">No reviews yet. Be the first to share your experience.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-3"><Stars value={review.rating} /><span className="text-sm font-semibold text-stone-900">{review.author}</span><span className="text-xs text-stone-400">{date(review.createdAt)}</span></div>
                {review.title && <p className="mt-2 font-semibold text-stone-900">{review.title}</p>}
                {review.comment && <p className="mt-1 leading-relaxed text-stone-700">{review.comment}</p>}
                {review.adminReply && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><span className="font-semibold">Store reply: </span>{review.adminReply}</p>}
              </li>
            ))}
          </ul>
        )}
        {data?.pagination?.hasNextPage && <button type="button" disabled={loading} onClick={() => setPage((value) => value + 1)} className={`${btn.secondary} h-11 text-sm`}>{loading ? 'Loading…' : 'Show more reviews'}</button>}
      </div>
    </div>
  );
}

function InfoTable({ product }) {
  const dims = product.dimensions ?? {};
  const rows = [
    ['SKU', product.sku],
    ['Brand', product.brand],
    ['Category', product.category?.name],
    ['Subcategory', product.subcategory?.name],
    ['Weight', product.weight ? `${product.weight} kg` : null],
    ['Dimensions', dims.length || dims.width || dims.height ? `${dims.length || 0} × ${dims.width || 0} × ${dims.height || 0} cm` : null],
    ['Colours', product.colors?.join(', ')],
    ['Sizes', product.sizes?.join(', ')],
    ['Material', product.material],
    ['Warranty', product.warranty],
    ['Tags', product.tags?.join(', ')],
  ].filter(([, value]) => value);
  return (
    <dl className="divide-y divide-stone-100 overflow-hidden rounded-2xl ring-1 ring-stone-200/70">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[140px_1fr] gap-4 px-5 py-3.5 text-sm odd:bg-stone-50/60 sm:grid-cols-[200px_1fr]">
          <dt className="font-semibold text-stone-700">{label}</dt><dd className="text-stone-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const Prose = ({ text }) => <div className="max-w-3xl leading-relaxed whitespace-pre-line text-stone-700">{text}</div>;

function Tabs({ product }) {
  const tabs = [
    product.description && { key: 'description', label: 'Description', body: <Prose text={product.description} /> },
    { key: 'info', label: 'Product information', body: <InfoTable product={product} /> },
    product.ingredients && { key: 'ingredients', label: 'Ingredients', body: <Prose text={product.ingredients} /> },
    product.howToUse && { key: 'how', label: 'How to use', body: <Prose text={product.howToUse} /> },
    product.benefits && { key: 'benefits', label: 'Benefits', body: <Prose text={product.benefits} /> },
    { key: 'reviews', label: `Reviews (${product.ratingCount})`, body: <Reviews product={product} /> },
  ].filter(Boolean);
  const [active, setActive] = useState(tabs[0].key);
  useEffect(() => setActive(tabs[0].key), [product.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];
  return (
    <section className="mt-16" id="details">
      <div role="tablist" aria-label="Product details" className="flex gap-1 overflow-x-auto border-b border-stone-200 [scrollbar-width:none]">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" role="tab" id={`tab-${tab.key}`} aria-selected={tab.key === current.key} aria-controls={`panel-${tab.key}`} onClick={() => setActive(tab.key)} className={`-mb-px shrink-0 cursor-pointer border-b-2 px-5 py-3.5 text-sm font-semibold transition ${tab.key === current.key ? 'border-emerald-800 text-emerald-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>{tab.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`} className="py-8">{current.body}</div>
    </section>
  );
}

function FrequentlyBought({ product }) {
  const cart = useCart();
  const toast = useToast();
  const items = [product, ...product.frequentlyBoughtTogether.filter((item) => item.inStock)].slice(0, 4);
  if (items.length < 2) return null;
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return (
    <section className="mt-16 rounded-3xl bg-emerald-50/60 p-6 ring-1 ring-emerald-900/5 sm:p-8">
      <h2 className="font-serif text-2xl font-semibold text-emerald-950">Frequently bought together</h2>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-4">
            {index > 0 && <span className="text-2xl text-emerald-700/50">+</span>}
            <Link to={`/product/${item.slug}`} className="w-32 text-center">
              <div className="aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200"><ProductImage src={item.thumbnail || item.image} alt={item.name} /></div>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-stone-800">{item.name}</p>
              <p className="text-sm font-bold text-emerald-900">{money(item.price)}</p>
            </Link>
          </div>
        ))}
        <div className="ml-auto">
          <p className="text-sm text-stone-600">Total for {items.length} items</p>
          <p className="font-serif text-2xl font-semibold text-emerald-950">{money(total)}</p>
          <button type="button" onClick={() => { const added = items.filter((item) => cart.add(item, 1, { silent: true })).length; if (added) toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`); else toast.info('These items are already in your cart at the maximum available quantity'); }} className={`${btn.primary} mt-3 h-11 text-sm`}><ShoppingBag size={16} /> Add all to cart</button>
        </div>
      </div>
    </section>
  );
}

function RecentlyViewed({ productId }) {
  const ids = recentlyViewed(productId).slice(0, 4);
  const { data } = useApi(() => (ids.length ? storeApi.get('/store/products', { ids: ids.join(','), limit: 4 }) : Promise.resolve({ items: [] })), [productId]);
  if (!data?.items?.length) return null;
  return (
    <section className="mt-16">
      <SectionHeading title="Recently viewed" />
      <ProductGrid products={data.items} />
    </section>
  );
}

function ProductSkeleton() {
  return (
    <Container className="py-10" aria-busy="true">
      <div className="grid gap-10 lg:grid-cols-2">
        <Skel className="aspect-square rounded-3xl" />
        <div className="space-y-4"><Skel className="h-4 w-32" /><Skel className="h-10 w-3/4" /><Skel className="h-5 w-40" /><Skel className="h-9 w-48" /><Skel className="h-24 w-full" /><Skel className="h-12 w-full rounded-full" /></div>
      </div>
    </Container>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const { info } = useStore();
  const [quantity, setQuantity] = useState(1);
  const { data: product, loading, error } = useApi(() => storeApi.get(`/store/products/${slug}`), [slug]);
  usePageMeta(product?.seo?.title || product?.name, product?.seo?.description || product?.shortDescription);

  useEffect(() => {
    setQuantity(1);
    if (product?.id) rememberViewed(product.id);
  }, [product?.id]);

  if (loading && !product) return <ProductSkeleton />;
  if (error) {
    return <Container className="py-16"><EmptyBlock icon={PackageX} title="Product not found" message="It may have been removed or is no longer available." action={<Link to="/products" className={`${btn.primary} h-11`}>Browse products</Link>} /></Container>;
  }

  const max = product.availableQuantity ?? 99;
  const saved = wishlist.has(product.id);
  const inCart = cart.quantityOf(product.id);
  const addToCart = () => cart.add(product, quantity);
  const buyNow = () => { if (inCart || cart.add(product, quantity, { silent: true })) navigate('/checkout'); };
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
      else window.prompt('Copy this link', url);
    } catch { /* cancelled */ }
  }

  return (
    <>
      <Container className="py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-emerald-800">Home</Link></li><li>/</li>
            <li><Link to="/products" className="hover:text-emerald-800">Products</Link></li>
            {product.category && <><li>/</li><li><Link to={`/category/${product.category.slug}`} className="hover:text-emerald-800">{product.category.name}</Link></li></>}
            <li>/</li><li className="text-stone-700">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery product={product} />
          <div>
            {product.brand && <p className="text-sm font-semibold tracking-wider text-emerald-700 uppercase">{product.brand}</p>}
            <h1 className="mt-1 font-serif text-3xl leading-tight font-semibold text-emerald-950 sm:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <a href="#details" className="inline-flex items-center gap-2"><Stars value={product.ratingAverage} size={16} /><span className="text-stone-600">{product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</span></a>
              <span className="text-stone-400">SKU: {product.sku}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Price price={product.price} regularPrice={product.regularPrice} size="lg" />
              {product.onSale && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">Save {money(product.regularPrice - product.price)} ({product.discountPercentage}%)</span>}
            </div>
            {info?.taxRate > 0 && <p className="mt-1 text-xs text-stone-500">VAT/tax is calculated at checkout.</p>}
            <StockBadge product={product} className="mt-4 text-sm" />
            {product.shortDescription && <p className="mt-5 leading-relaxed text-stone-700">{product.shortDescription}</p>}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} max={max} />
              <button type="button" disabled={!product.inStock} onClick={addToCart} className={`${btn.primary} h-12 min-w-36 flex-1 whitespace-nowrap`}><ShoppingBag size={18} /> {product.inStock ? 'Add to cart' : 'Out of stock'}</button>
              <button type="button" disabled={!product.inStock} onClick={buyNow} className={`${btn.accent} h-12 min-w-36 flex-1 whitespace-nowrap`}><Zap size={18} /> Buy now</button>
            </div>
            {inCart > 0 && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-800"><Check size={16} /> {inCart} in your cart · <Link to="/cart" className="font-semibold underline">View cart</Link></p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => wishlist.toggle(product)} aria-pressed={saved} className={`${btn.ghost} h-10 text-sm ${saved ? 'text-rose-600' : ''}`}><Heart size={17} className={saved ? 'fill-current' : ''} /> {saved ? 'Saved' : 'Add to wishlist'}</button>
              <button type="button" onClick={share} className={`${btn.ghost} h-10 text-sm`}><Share2 size={17} /> Share</button>
            </div>

            <div className="mt-8 divide-y divide-stone-100 rounded-3xl ring-1 ring-stone-200/80">
              {info?.shippingMethods?.length > 0 && (
                <div className="flex gap-4 p-5">
                  <Truck size={22} className="mt-0.5 shrink-0 text-emerald-700" />
                  <div className="text-sm">
                    <p className="font-semibold text-stone-900">Delivery</p>
                    <ul className="mt-1 space-y-1 text-stone-600">
                      {info.shippingMethods.map((method) => (
                        <li key={method.id}>{method.name}{method.zone ? ` (${method.zone})` : ''}: {method.charge ? money(method.charge) : 'Free'}{method.estimatedDelivery ? ` · ${method.estimatedDelivery}` : ''}{method.freeShippingThreshold ? ` · free over ${money(method.freeShippingThreshold)}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="flex gap-4 p-5">
                <Banknote size={22} className="mt-0.5 shrink-0 text-emerald-700" />
                <div className="text-sm"><p className="font-semibold text-stone-900">Payment</p><p className="mt-1 text-stone-600">Cash on delivery — pay when your order arrives.</p></div>
              </div>
            </div>
          </div>
        </div>

        <Tabs product={product} />
        <FrequentlyBought product={product} />
        {product.related.length > 0 && (
          <section className="mt-16">
            <SectionHeading title="You may also like" />
            <ProductGrid products={product.related.slice(0, 4)} />
          </section>
        )}
        <RecentlyViewed productId={product.id} />
      </Container>

      {/* Sticky add-to-cart on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-stone-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-stone-900">{product.name}</p><p className="text-sm font-bold text-emerald-900">{money(product.price)}</p></div>
        <button type="button" disabled={!product.inStock} onClick={addToCart} className={`${btn.primary} h-11 text-sm`}><ShoppingBag size={16} /> {product.inStock ? 'Add to cart' : 'Sold out'}</button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
}
