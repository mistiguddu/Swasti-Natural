'use client';

import { Link } from '@/router';
import { Ban, Check, CircleDot, MapPin, Package, RotateCcw, Truck } from 'lucide-react';
import { date, dateTime, money } from '../../lib/format.js';
import { ORDER_STEPS, PAYMENT_LABELS } from '../lib/helpers.js';
import { ProductImage } from './ui.jsx';

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 ring-sky-200',
  processing: 'bg-violet-50 text-violet-800 ring-violet-200',
  shipped: 'bg-teal-50 text-teal-800 ring-teal-200',
  delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-800 ring-rose-200',
  returned: 'bg-orange-50 text-orange-800 ring-orange-200',
};
const label = (value) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function OrderStatusBadge({ status }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_STYLE[status] ?? 'bg-stone-100 text-stone-700 ring-stone-200'}`}>{label(status)}</span>;
}

export function PaymentBadge({ status }) {
  const tone = { paid: 'text-emerald-700', pending: 'text-amber-700', failed: 'text-rose-700', refunded: 'text-stone-600' }[status] ?? 'text-stone-600';
  return <span className={`text-xs font-semibold ${tone}`}>Payment {status}</span>;
}

/** Visual progress across pending → delivered (cancel/return shown separately). */
export function OrderProgress({ order }) {
  if (order.status === 'cancelled' || order.status === 'returned') {
    const Icon = order.status === 'cancelled' ? Ban : RotateCcw;
    return <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-100"><Icon size={20} /> This order was {order.status}.</div>;
  }
  const current = ORDER_STEPS.indexOf(order.status);
  const icons = [CircleDot, Check, Package, Truck, Check];
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Order progress">
      {ORDER_STEPS.map((step, index) => {
        const Icon = icons[index];
        const done = index <= current;
        return (
          <li key={step} className="flex flex-col items-center text-center" aria-current={index === current ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-1 flex-1 rounded-full ${index === 0 ? 'opacity-0' : done ? 'bg-emerald-700' : 'bg-stone-200'}`} />
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-400'} ${index === current ? 'ring-4 ring-emerald-800/15' : ''}`}><Icon size={17} /></span>
              <span className={`h-1 flex-1 rounded-full ${index === ORDER_STEPS.length - 1 ? 'opacity-0' : index < current ? 'bg-emerald-700' : 'bg-stone-200'}`} />
            </div>
            <span className={`mt-2 text-[11px] font-semibold sm:text-xs ${done ? 'text-emerald-900' : 'text-stone-400'}`}>{label(step)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Full order details (used by order details, confirmation and tracking pages). */
export default function OrderView({ order }) {
  const address = order.shippingAddress ?? {};
  const totals = [
    ['Subtotal', money(order.subtotal)],
    order.discount > 0 && [`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `−${money(order.discount)}`],
    ['Delivery', order.shippingCharge ? money(order.shippingCharge) : 'Free'],
    order.tax > 0 && ['Tax', money(order.tax)],
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 ring-1 ring-stone-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">Order</p>
            <p className="font-serif text-2xl font-semibold text-emerald-950">{order.orderNumber}</p>
            <p className="text-sm text-stone-500">Placed {dateTime(order.createdAt)}</p>
          </div>
          <div className="text-right"><OrderStatusBadge status={order.status} /><div className="mt-1"><PaymentBadge status={order.paymentStatus} /></div></div>
        </div>
        <div className="mt-6"><OrderProgress order={order} /></div>
        {order.trackingNumber && <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-2 text-sm text-stone-700"><Truck size={16} /> Tracking number: <strong>{order.trackingNumber}</strong></p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl bg-white ring-1 ring-stone-200/80">
          <h3 className="border-b border-stone-100 px-6 py-4 font-semibold text-stone-900">Items ({order.itemCount})</h3>
          <ul className="divide-y divide-stone-100">
            {order.items.map((item) => (
              <li key={`${item.product}-${item.sku}`} className="flex items-center gap-4 px-6 py-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100"><ProductImage src={item.image} alt={item.name} /></div>
                <div className="min-w-0 flex-1 text-sm"><p className="font-semibold text-stone-900">{item.name}</p><p className="text-stone-500">{item.quantity} × {money(item.price)}</p></div>
                <p className="font-semibold text-stone-900 tabular-nums">{money(item.total)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-stone-100 px-6 py-5 text-sm">
            {totals.map(([name, value]) => <div key={name} className="flex justify-between"><dt className="text-stone-600">{name}</dt><dd className="font-medium text-stone-900 tabular-nums">{value}</dd></div>)}
            <div className="flex justify-between border-t border-stone-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-serif text-xl font-semibold text-emerald-950 tabular-nums">{money(order.grandTotal)}</dd></div>
          </dl>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 text-sm ring-1 ring-stone-200/80">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900"><MapPin size={16} className="text-emerald-700" /> Delivery address</h3>
            <p className="mt-3 text-stone-800">{address.name}</p>
            <p className="text-stone-600">{address.phone}</p>
            <p className="mt-1 text-stone-600">{[address.line1, address.line2, address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
            {order.notes && <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-stone-600">Note: {order.notes}</p>}
            {order.shippingMethodName && <p className="mt-3 text-stone-600">Delivery: {order.shippingMethodName}</p>}
          </div>
          <div className="rounded-3xl bg-white p-6 text-sm ring-1 ring-stone-200/80">
            <h3 className="font-semibold text-stone-900">Payment</h3>
            <p className="mt-2 text-stone-700">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <div className="rounded-3xl bg-white p-6 text-sm ring-1 ring-stone-200/80">
            <h3 className="font-semibold text-stone-900">Timeline</h3>
            <ol className="mt-3 space-y-3">
              {[...order.timeline].reverse().map((event, index) => (
                <li key={`${event.status}-${event.at}`} className="flex gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-emerald-600' : 'bg-stone-300'}`} />
                  <div><p className="font-medium text-stone-900">{label(event.status.replace('payment_', 'payment '))}</p>{event.note && <p className="text-stone-600">{event.note}</p>}<p className="text-xs text-stone-400">{dateTime(event.at)}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderRow({ order }) {
  return (
    <li>
      <Link to={`/account/orders/${order.orderNumber}`} className="flex flex-wrap items-center gap-4 p-5 transition hover:bg-stone-50">
        <div className="flex -space-x-3">
          {order.items.slice(0, 3).map((item) => <div key={`${item.product}-${item.sku}`} className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100 ring-2 ring-white"><ProductImage src={item.image} alt="" /></div>)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900">{order.orderNumber}</p>
          <p className="text-sm text-stone-500">{date(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}</p>
        </div>
        <OrderStatusBadge status={order.status} />
        <p className="w-24 text-right font-semibold text-stone-900 tabular-nums">{money(order.grandTotal)}</p>
      </Link>
    </li>
  );
}
