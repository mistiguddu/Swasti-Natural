'use client';

import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from '@/router';
import { CheckCircle2, PackageSearch, Search } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import OrderView from '../components/OrderView.jsx';
import { RequireCustomer } from './AccountPages.jsx';
import { Container, EmptyBlock, ErrorBlock, PageHeader, Skel, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';
import { money } from '../../lib/format.js';

export function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  usePageMeta('Order confirmed');
  const { data, loading, error, reload } = useApi(() => storeApi.get(`/store/account/orders/${encodeURIComponent(orderNumber)}`), [orderNumber]);
  return (
    <RequireCustomer>
      <div className="bg-gradient-to-b from-emerald-50 to-white">
        <Container className="py-12">
          <div className="mx-auto max-w-2xl text-center motion-safe:animate-fade-up">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-800 text-white shadow-lg shadow-emerald-900/20"><CheckCircle2 size={40} /></span>
            <h1 className="mt-6 font-serif text-4xl font-semibold text-emerald-950">Thank you for your order!</h1>
            <p className="mt-3 text-stone-600">Your order <strong className="text-emerald-900">{orderNumber}</strong> has been placed. {data && <>Please keep <strong>{money(data.grandTotal)}</strong> ready for cash on delivery.</>}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to={`/track-order?order=${encodeURIComponent(orderNumber)}`} className={`${btn.primary} h-12`}><PackageSearch size={17} /> Track this order</Link>
              <Link to="/products" className={`${btn.secondary} h-12`}>Continue shopping</Link>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            {loading && !data ? <Skel className="h-96 rounded-3xl" /> : error ? <ErrorBlock error={error} onRetry={reload} /> : <OrderView order={data} />}
          </div>
        </Container>
      </div>
    </RequireCustomer>
  );
}

/** Track an order by its number (only the signed-in customer’s own orders). */
export function TrackOrderPage() {
  usePageMeta('Track your order');
  const { isSignedIn } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderNumber = params.get('order') ?? '';
  const [input, setInput] = useState(orderNumber);
  const { data, loading, error } = useApi(
    () => storeApi.get(`/store/account/orders/${encodeURIComponent(orderNumber.trim())}`),
    [orderNumber, isSignedIn],
    { enabled: Boolean(orderNumber.trim()) && isSignedIn },
  );

  return (
    <>
      <PageHeader title="Track your order" description="Enter your order number to see its latest status." crumbs={[{ label: 'Track order' }]} />
      <Container className="py-10">
        <form onSubmit={(event) => { event.preventDefault(); navigate(`/track-order?order=${encodeURIComponent(input.trim().toUpperCase())}`); }} className="mx-auto flex max-w-xl gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="e.g. SN-000123" aria-label="Order number" className="h-13 min-w-0 flex-1 rounded-full border border-stone-200 px-6 uppercase outline-none placeholder:normal-case focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" />
          <button type="submit" className={`${btn.primary} h-13`}><Search size={17} /> Track</button>
        </form>
        <div className="mx-auto mt-10 max-w-5xl">
          {!isSignedIn ? (
            <EmptyBlock icon={PackageSearch} title="Sign in to track your order" message="For your privacy, order details are only shown to the account that placed the order." action={<Link to={`/login?next=${encodeURIComponent(`/track-order${orderNumber ? `?order=${orderNumber}` : ''}`)}`} className={`${btn.primary} h-11`}>Sign in</Link>} />
          ) : !orderNumber ? (
            <p className="text-center text-stone-600">You can also see all your orders in <Link to="/account/orders" className="font-semibold text-emerald-800 underline">My orders</Link>.</p>
          ) : loading && !data ? <Skel className="h-96 rounded-3xl" /> : error ? (
            error.status === 404 ? <EmptyBlock icon={PackageSearch} title="Order not found" message={`We couldn’t find order “${orderNumber}” in your account. Check the number and try again.`} /> : <ErrorBlock error={error} />
          ) : data && <OrderView order={data} />}
        </div>
      </Container>
    </>
  );
}
