'use client';

import { useState } from 'react';
import { Link, useNavigate } from '@/router';
import { AlertTriangle, ArrowLeft, ArrowRight, Lock, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { money } from '../../lib/format.js';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { Container, EmptyBlock, PageHeader, ProductImage, QuantityStepper, btn } from '../components/ui.jsx';
import { CouponField, Totals } from '../components/OrderSummary.jsx';
import { useCartQuote } from '../lib/useCartQuote.js';
import { usePageMeta } from '../lib/helpers.js';

export default function CartPage() {
  usePageMeta('Shopping cart');
  const cart = useCart();
  const { isSignedIn } = useCustomer();
  const navigate = useNavigate();
  const { quote, loading, error, shippingMethod, methods } = useCartQuote();
  const [confirmClear, setConfirmClear] = useState(false);
  const lineFor = (id) => quote?.lines.find((line) => line.product === id);
  const problems = quote?.lines.filter((line) => line.status !== 'ok') ?? [];

  if (!cart.items.length) {
    return (
      <>
        <PageHeader title="Your cart" crumbs={[{ label: 'Cart' }]} />
        <Container className="py-12">
          <EmptyBlock icon={ShoppingBag} title="Your cart is empty" message="Looks like you haven’t added anything yet. Explore our products and find something you’ll love." action={<Link to="/products" className={`${btn.primary} h-12`}>Start shopping <ArrowRight size={17} /></Link>} />
        </Container>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Your cart" description={`${cart.count} item${cart.count === 1 ? '' : 's'} in your cart`} crumbs={[{ label: 'Cart' }]} />
      <Container className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {problems.length > 0 && (
            <div role="alert" className="mb-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>Some items need your attention before checkout. Adjust the quantity or remove them.</div>
            </div>
          )}
          <ul className="divide-y divide-stone-100 rounded-3xl ring-1 ring-stone-200/80">
            {cart.items.map((item) => {
              const line = lineFor(item.product);
              const issue = line && line.status !== 'ok' ? line : null;
              const unitPrice = line?.price ?? item.price;
              return (
                <li key={item.product} className="flex gap-4 p-4 sm:p-5">
                  <Link to={`/product/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100 sm:h-28 sm:w-28"><ProductImage src={item.image} alt={item.name} /></Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/product/${item.slug}`} className="font-semibold text-stone-900 hover:text-emerald-800">{line?.name ?? item.name}</Link>
                      <button type="button" onClick={() => cart.remove(item.product)} aria-label={`Remove ${item.name}`} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold text-emerald-900">{money(unitPrice)}</span>
                      {(line?.regularPrice ?? item.regularPrice) > unitPrice && <span className="ml-2 text-stone-400 line-through">{money(line?.regularPrice ?? item.regularPrice)}</span>}
                      {line?.unitDiscount > 0 && <span className="ml-2 text-xs font-semibold text-emerald-700">−{money(line.unitDiscount)} discount</span>}
                    </p>
                    {issue && <p className="mt-1 text-sm font-medium text-rose-700">{issue.message}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      {issue?.status === 'unavailable' ? <span /> : <QuantityStepper size="sm" value={item.quantity} onChange={(quantity) => cart.update(item.product, quantity)} max={line?.availableQuantity ?? item.availableQuantity ?? 99} />}
                      <p className="font-semibold text-stone-900 tabular-nums">{money(unitPrice * item.quantity)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Link to="/products" className={`${btn.ghost} h-11 text-sm`}><ArrowLeft size={16} /> Continue shopping</Link>
            <button type="button" onClick={() => setConfirmClear(true)} className={`${btn.ghost} h-11 text-sm text-rose-700 hover:bg-rose-50`}><Trash2 size={16} /> Clear cart</button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl bg-stone-50 p-6 ring-1 ring-stone-200/70">
            <h2 className="font-serif text-2xl font-semibold text-emerald-950">Order summary</h2>
            {methods.length > 0 && (
              <label className="mt-5 block text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-stone-700"><Truck size={15} /> Delivery</span>
                <select value={shippingMethod} onChange={(event) => cart.setShippingMethod(event.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-700">
                  {methods.map((method) => <option key={method.id} value={method.id}>{method.name} — {method.charge ? money(method.charge) : 'Free'}{method.estimatedDelivery ? ` (${method.estimatedDelivery})` : ''}</option>)}
                </select>
              </label>
            )}
            <div className="mt-5"><CouponField quote={quote} /></div>
            <div className="mt-6">{error ? <p className="text-sm text-rose-700">{error.message}</p> : <Totals quote={quote} loading={loading} />}</div>
            <button
              type="button"
              disabled={!quote?.canCheckout || loading}
              onClick={() => navigate(isSignedIn ? '/checkout' : '/login?next=/checkout')}
              className={`${btn.primary} mt-6 h-13 w-full text-base`}
            >
              <Lock size={17} /> Proceed to checkout
            </button>
            {!isSignedIn && <p className="mt-3 text-center text-xs text-stone-500">You’ll sign in or create an account at the next step.</p>}
          </div>
        </aside>
      </Container>
      <ConfirmationModal open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={() => { cart.clear(); setConfirmClear(false); }} title="Clear your cart?" message="All items will be removed from your cart." confirmLabel="Clear cart" />
    </>
  );
}
