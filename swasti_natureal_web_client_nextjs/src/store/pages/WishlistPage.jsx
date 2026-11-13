'use client';

import { Link } from '@/router';
import { ArrowRight, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { Container, EmptyBlock, PageHeader, Price, ProductImage, Skel, StockBadge, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';

/** Wishlist list (also embedded in My account). */
export function WishlistItems() {
  const wishlist = useWishlist();
  const cart = useCart();
  const ids = wishlist.ids.join(',');
  const { data, loading } = useApi(() => (ids ? storeApi.get('/store/products', { ids, limit: 48 }) : Promise.resolve({ items: [] })), [ids]);
  const items = (data?.items ?? []).filter((item) => wishlist.has(item.id));

  if (!wishlist.count) {
    return <EmptyBlock icon={Heart} title="Your wishlist is empty" message="Tap the heart on any product to save it for later." action={<Link to="/products" className={`${btn.primary} h-12`}>Discover products <ArrowRight size={17} /></Link>} />;
  }
  if (loading && !data) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skel key={i} className="h-32 rounded-3xl" />)}</div>;

  return (
    <ul className="divide-y divide-stone-100 rounded-3xl ring-1 ring-stone-200/80">
      {items.map((product) => (
        <li key={product.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5">
          <Link to={`/product/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100"><ProductImage src={product.thumbnail || product.image} alt={product.name} /></Link>
          <div className="min-w-0 flex-1">
            <Link to={`/product/${product.slug}`} className="font-semibold text-stone-900 hover:text-emerald-800">{product.name}</Link>
            <div className="mt-1"><Price price={product.price} regularPrice={product.regularPrice} /></div>
            <StockBadge product={product} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={!product.inStock} onClick={() => { if (cart.add(product)) wishlist.toggle(product); }} className={`${btn.primary} h-11 text-sm`}><ShoppingBag size={16} /> Move to cart</button>
            <button type="button" onClick={() => wishlist.toggle(product)} aria-label={`Remove ${product.name} from wishlist`} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-stone-500 ring-1 ring-stone-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function WishlistPage() {
  usePageMeta('Wishlist');
  const wishlist = useWishlist();
  const { isSignedIn } = useCustomer();
  return (
    <>
      <PageHeader title="Wishlist" description={`${wishlist.count} saved item${wishlist.count === 1 ? '' : 's'}`} crumbs={[{ label: 'Wishlist' }]} />
      <Container className="py-10">
        {!isSignedIn && wishlist.count > 0 && <p className="mb-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ring-1 ring-emerald-100"><Link to="/login?next=/wishlist" className="font-semibold underline">Sign in</Link> to keep your wishlist on all your devices.</p>}
        <WishlistItems />
      </Container>
    </>
  );
}
