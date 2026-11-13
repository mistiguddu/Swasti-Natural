'use client';

import { useEffect, useState } from 'react';
import { Link, useParams } from '@/router';
import { CheckCircle2, CircleDot, CreditCard, MapPin, Package, Printer, Truck, UserRound } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, CardHeader, DetailItem, PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormInput, SelectInput, TextArea } from '../../components/ui/Form.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { ProductDetailsSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { dateTime, money, PAYMENT_METHOD_LABELS, PAYMENT_STATUSES, titleCase } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

function Address({ address }) {
  const lines = [address?.name, address?.phone, address?.line1, address?.line2, [address?.city, address?.state, address?.postalCode].filter(Boolean).join(', '), address?.country].filter(Boolean);
  return lines.length ? <address className="text-sm leading-relaxed text-slate-700 not-italic">{lines.map((line) => <span key={line} className="block">{line}</span>)}</address> : <p className="text-sm text-slate-400">{t('Not provided')}</p>;
}

function StatusForm({ order, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({ status: order.allowedStatuses[0] ?? '', note: '', trackingNumber: order.trackingNumber ?? '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm({ status: order.allowedStatuses[0] ?? '', note: '', trackingNumber: order.trackingNumber ?? '' }), [order]);

  if (!order.allowedStatuses.length) return <p className="text-sm text-slate-500">{t('This order is')} <strong>{order.status}</strong>{t('. No further status changes are possible.')}</p>;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch(`/orders/${order.id}/status`, form);
      toast.success(`Order marked as ${form.status}`);
      onUpdated(updated);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SelectInput label="New status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} options={order.allowedStatuses.map((value) => ({ value, label: titleCase(value) }))} />
      {['shipped', 'delivered'].includes(form.status) && <FormInput label="Tracking number" value={form.trackingNumber} onChange={(event) => setForm((current) => ({ ...current, trackingNumber: event.target.value }))} />}
      <TextArea label="Note (optional)" rows={2} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Visible in the order timeline" />
      {['cancelled', 'returned'].includes(form.status) && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">{t('Stock for these items will be returned to inventory.')}</p>}
      <Button type="submit" className="w-full" busy={saving} busyLabel="Updating…">{t('Update status')}</Button>
    </form>
  );
}

function PaymentForm({ order, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({ paymentStatus: order.paymentStatus, transactionId: order.transactionId ?? '', note: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm({ paymentStatus: order.paymentStatus, transactionId: order.transactionId ?? '', note: '' }), [order]);
  const dirty = form.paymentStatus !== order.paymentStatus || form.transactionId !== (order.transactionId ?? '');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch(`/orders/${order.id}/payment`, form);
      toast.success('Payment updated');
      onUpdated(updated);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SelectInput label="Payment status" value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))} options={PAYMENT_STATUSES.map((value) => ({ value, label: titleCase(value) }))} />
      <FormInput label="Transaction ID" value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} />
      <Button type="submit" variant="secondary" className="w-full" disabled={!dirty} busy={saving} busyLabel="Saving…">{t('Save payment')}</Button>
    </form>
  );
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useApi(() => api.get(`/orders/${id}`), [id]);
  const order = data;
  const breadcrumb = [{ label: 'Orders', to: '/orders' }, { label: order?.orderNumber ?? 'Details' }];
  const onUpdated = () => reload();

  if (loading && !order) return (<><PageHeader breadcrumb={breadcrumb} title="Order details" /><ProductDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="Order details" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);

  const totals = [
    ['Subtotal', money(order.subtotal)],
    ['Discount', order.discount ? `−${money(order.discount)}` : money(0), order.couponCode ? `Coupon ${order.couponCode}` : null],
    ['Shipping', money(order.shippingCharge), order.shippingMethodName || null],
    ['Tax', money(order.tax)],
  ];

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={`Order ${order.orderNumber}`}
        description={<span className="inline-flex flex-wrap items-center gap-2">Placed {dateTime(order.createdAt)} <StatusBadge status={order.status} /> <StatusBadge status={order.paymentStatus} label={`Payment ${order.paymentStatus}`} /></span>}
        actions={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>{t('Print')}</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Items" icon={Package} description={`${order.items.length} product(s)`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase"><th className="px-5 py-2.5">{t('Product')}</th><th className="px-3 py-2.5 text-right">{t('Price')}</th><th className="px-3 py-2.5 text-right">{t('Qty')}</th><th className="px-5 py-2.5 text-right">{t('Total')}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, index) => (
                    <tr key={`${item.sku}-${index}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb src={item.image} size="h-10 w-10" icon={Package} />
                          <div>
                            {item.product?.id ? <Link to={`/products/${item.product.id}`} className="font-semibold text-slate-800 hover:text-teal-700">{item.name}</Link> : <span className="font-semibold text-slate-800">{item.name}</span>}
                            <p className="text-xs text-slate-400">{item.sku}{item.discount ? ` · discount −${money(item.discount)}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(item.price)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">× {item.quantity}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">{money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-sm space-y-2 border-t border-slate-100 px-5 py-4 text-sm">
              {totals.map(([label, value, note]) => (
                <div key={label} className="flex justify-between gap-4"><dt className="text-slate-500">{label}{note && <span className="block text-[11px] text-slate-400">{note}</span>}</dt><dd className="text-slate-800 tabular-nums">{value}</dd></div>
              ))}
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-2 text-base"><dt className="font-semibold text-slate-900">{t('Grand total')}</dt><dd className="font-display font-bold text-slate-900 tabular-nums">{money(order.grandTotal)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="Shipping address" icon={MapPin} />
              <div className="p-5"><Address address={order.shippingAddress} />{order.trackingNumber && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600"><Truck size={13} /> {t('Tracking:')} <strong>{order.trackingNumber}</strong></p>}</div>
            </Card>
            <Card>
              <CardHeader title="Billing address" icon={CreditCard} />
              <div className="p-5"><Address address={order.billingAddress} /></div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Order timeline" />
            <ol className="space-y-5 p-5">
              {[...order.timeline].reverse().map((event, index) => (
                <li key={`${event.status}-${event.at}`} className="flex gap-3">
                  <span className={`mt-0.5 ${index === 0 ? 'text-teal-600' : 'text-slate-300'}`}>{index === 0 ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{titleCase(event.status.replace('payment_', 'payment '))}</p>
                    {event.note && <p className="text-sm text-slate-600">{event.note}</p>}
                    <p className="text-xs text-slate-400">{dateTime(event.at)}{event.by ? ` · ${event.by}` : ''}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          {order.notes && <Card><CardHeader title="Customer notes" /><p className="p-5 text-sm whitespace-pre-line text-slate-700">{order.notes}</p></Card>}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Update status" />
            <div className="p-5"><StatusForm order={order} onUpdated={onUpdated} /></div>
          </Card>
          <Card>
            <CardHeader title="Customer" icon={UserRound} />
            <dl className="space-y-4 p-5">
              <DetailItem label="Name">{order.customer?.id ? <Link to={`/customers/${order.customer.id}`} className="font-semibold text-teal-700 hover:underline">{order.customerInfo.name}</Link> : order.customerInfo.name}</DetailItem>
              <DetailItem label="Email">{order.customerInfo.email}</DetailItem>
              <DetailItem label="Phone">{order.customerInfo.phone || null}</DetailItem>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Payment" icon={CreditCard} />
            <div className="space-y-4 p-5">
              <dl className="grid grid-cols-2 gap-4">
                <DetailItem label="Method">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</DetailItem>
                <DetailItem label="Paid at">{order.paidAt ? dateTime(order.paidAt) : null}</DetailItem>
              </dl>
              <PaymentForm order={order} onUpdated={(updated) => setData((current) => ({ ...current, ...updated }))} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
