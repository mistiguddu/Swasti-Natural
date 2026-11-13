'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from '@/router';
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Lock, MapPin, Plus, ShieldCheck, Truck } from 'lucide-react';
import { storeApi } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { money } from '../../lib/format.js';
import { DIVISIONS, DIVISION_NAMES } from '../data/bangladesh.js';
import { Container, ProductImage, SelectField, TextAreaField, TextField, apiFieldErrors, btn } from '../components/ui.jsx';
import { CouponField, Totals } from '../components/OrderSummary.jsx';
import { useCartQuote } from '../lib/useCartQuote.js';
import { usePageMeta } from '../lib/helpers.js';

const STEPS = ['Information', 'Delivery', 'Review', 'Payment', 'Place order'];
const EMPTY_ADDRESS = { label: 'Home', name: '', phone: '', division: '', district: '', area: '', line1: '', postalCode: '' };

function Stepper({ step }) {
  return (
    <ol className="mb-10 flex items-center" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={current ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${done ? 'bg-emerald-800 text-white' : current ? 'bg-emerald-800 text-white ring-4 ring-emerald-800/15' : 'bg-stone-100 text-stone-500'}`}>{done ? <Check size={16} /> : index + 1}</span>
              <span className={`hidden text-sm font-semibold md:inline ${current || done ? 'text-emerald-950' : 'text-stone-400'}`}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <span className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-4 ${done ? 'bg-emerald-800' : 'bg-stone-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200/80 sm:p-8 motion-safe:animate-fade-up">
      <h2 className="flex items-center gap-3 font-serif text-2xl font-semibold text-emerald-950"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={19} /></span>{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const describe = (address) => [address.line1, address.area, address.district, address.division, address.postalCode].filter(Boolean).join(', ');

export default function CheckoutPage() {
  usePageMeta('Checkout');
  const { isSignedIn, status, user, refresh } = useCustomer();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const { quote, loading: quoting, shippingMethod, methods } = useCartQuote();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [addressMode, setAddressMode] = useState('new');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [instructions, setInstructions] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCustomer((current) => ({ name: current.name || user.name, phone: current.phone || user.phone || '', email: current.email || user.email }));
    const saved = user.addresses ?? [];
    if (saved.length) {
      const preferred = saved.find((item) => item.isDefault) ?? saved[0];
      setAddressMode('saved');
      setSelectedAddress((current) => current || preferred.id || preferred._id);
    }
  }, [user]);

  const savedAddresses = user?.addresses ?? [];
  const chosen = useMemo(() => (addressMode === 'saved' ? savedAddresses.find((item) => (item.id ?? item._id) === selectedAddress) : address), [addressMode, savedAddresses, selectedAddress, address]);

  if (status === 'loading') return <Container className="py-20"><div className="h-96 rounded-3xl bg-stone-100 motion-safe:animate-pulse" /></Container>;
  if (!isSignedIn) return <Navigate to="/login?next=/checkout" replace />;
  if (!cart.items.length && !placing) return <Navigate to="/cart" replace />;

  const setAddr = (field) => (event) => {
    const value = event.target.value;
    setAddress((current) => ({ ...current, [field]: value, ...(field === 'division' ? { district: '' } : {}) }));
  };

  function validateInfo() {
    const next = {};
    if (customer.name.trim().length < 2) next.name = 'Please enter your full name';
    if (!/^\+?[0-9\s-]{7,20}$/.test(customer.phone.trim())) next.phone = 'Enter a valid mobile number';
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) next.email = 'Enter a valid email';
    setErrors(next);
    return !Object.keys(next).length;
  }
  function validateAddress() {
    if (addressMode === 'saved') {
      if (!chosen) { toast.error('Choose a delivery address'); return false; }
      return true;
    }
    const next = {};
    if (address.name.trim().length < 2) next.addrName = 'Enter the recipient’s name';
    if (!/^\+?[0-9\s-]{7,20}$/.test(address.phone.trim())) next.addrPhone = 'Enter a valid mobile number';
    if (!address.division) next.division = 'Choose a division';
    if (!address.district) next.district = 'Choose a district';
    if (address.line1.trim().length < 5) next.line1 = 'Enter your full address (house, road, area)';
    setErrors(next);
    return !Object.keys(next).length;
  }

  const go = (to) => { setStep(to); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function placeOrder() {
    if (!quote?.canCheckout) { toast.error('Please review your cart — some items are unavailable.'); go(2); return; }
    setPlacing(true);
    try {
      const deliveryAddress = { ...chosen, label: chosen.label || 'Home' };
      delete deliveryAddress._id; delete deliveryAddress.id; delete deliveryAddress.isDefault;
      const result = await storeApi.post('/store/account/checkout', {
        items: cart.requestItems,
        customer: { name: customer.name.trim(), phone: customer.phone.trim(), email: customer.email.trim() },
        address: deliveryAddress,
        instructions,
        couponCode: cart.couponCode,
        shippingMethod: shippingMethod || null,
        paymentMethod: 'cash_on_delivery',
        saveAddress: addressMode === 'new' && saveAddress,
      });
      cart.clear();
      refresh().catch(() => {});
      navigate(`/order-confirmation/${result.orderNumber}`, { replace: true });
    } catch (error) {
      setPlacing(false);
      const fields = apiFieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      toast.error(error.message);
      if (error.status === 409 || /stock|available|coupon/i.test(error.message)) go(2);
    }
  }

  return (
    <div className="bg-stone-50/70">
      <Container className="py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-4xl font-semibold text-emerald-950">Checkout</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-stone-600"><Lock size={15} className="text-emerald-700" /> Secure checkout</p>
        </div>
        <Stepper step={step} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {step === 0 && (
              <StepCard title="Your information" icon={ShieldCheck}>
                <form className="grid gap-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (validateInfo()) go(1); }} noValidate>
                  <TextField label="Full name" name="name" autoComplete="name" required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} error={errors.name} className="sm:col-span-2" />
                  <TextField label="Mobile number" name="phone" type="tel" autoComplete="tel" required placeholder="01XXXXXXXXX" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} error={errors.phone} />
                  <TextField label="Email" name="email" type="email" autoComplete="email" required value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} error={errors.email} hint="Order updates are linked to your account." />
                  <div className="flex justify-end sm:col-span-2"><button type="submit" className={`${btn.primary} h-12`}>Continue to delivery <ArrowRight size={17} /></button></div>
                </form>
              </StepCard>
            )}

            {step === 1 && (
              <StepCard title="Delivery address" icon={MapPin}>
                {savedAddresses.length > 0 && (
                  <div className="mb-6 space-y-3" role="radiogroup" aria-label="Saved addresses">
                    {savedAddresses.map((item) => {
                      const id = item.id ?? item._id;
                      return (
                        <label key={id} className={`flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition ${addressMode === 'saved' && selectedAddress === id ? 'bg-emerald-50 ring-emerald-700' : 'ring-stone-200 hover:bg-stone-50'}`}>
                          <input type="radio" name="address" checked={addressMode === 'saved' && selectedAddress === id} onChange={() => { setAddressMode('saved'); setSelectedAddress(id); }} className="mt-1 accent-emerald-700" />
                          <span className="text-sm">
                            <span className="font-semibold text-stone-900">{item.label}{item.isDefault && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800">Default</span>}</span>
                            <span className="mt-0.5 block text-stone-700">{item.name} · {item.phone}</span>
                            <span className="block text-stone-500">{describe(item)}</span>
                          </span>
                        </label>
                      );
                    })}
                    <label className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 ring-1 transition ${addressMode === 'new' ? 'bg-emerald-50 ring-emerald-700' : 'ring-stone-200 hover:bg-stone-50'}`}>
                      <input type="radio" name="address" checked={addressMode === 'new'} onChange={() => setAddressMode('new')} className="accent-emerald-700" />
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900"><Plus size={15} /> Use a new address</span>
                    </label>
                  </div>
                )}
                <form onSubmit={(event) => { event.preventDefault(); if (validateAddress()) go(2); }} noValidate>
                  {addressMode === 'new' && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField label="Recipient name" name="addrName" required value={address.name} onChange={setAddr('name')} onFocus={() => !address.name && setAddress((current) => ({ ...current, name: customer.name }))} error={errors.addrName} />
                      <TextField label="Recipient mobile" name="addrPhone" type="tel" required placeholder="01XXXXXXXXX" value={address.phone} onChange={setAddr('phone')} onFocus={() => !address.phone && setAddress((current) => ({ ...current, phone: customer.phone }))} error={errors.addrPhone} />
                      <SelectField label="Division" name="division" required placeholder="Select division" options={DIVISION_NAMES} value={address.division} onChange={setAddr('division')} error={errors.division} />
                      <SelectField label="District" name="district" required placeholder={address.division ? 'Select district' : 'Select a division first'} options={address.division ? DIVISIONS[address.division] : []} disabled={!address.division} value={address.district} onChange={setAddr('district')} error={errors.district} />
                      <TextField label="Upazila / Area" name="area" placeholder="e.g. Dhanmondi" value={address.area} onChange={setAddr('area')} />
                      <TextField label="Postal code" name="postalCode" value={address.postalCode} onChange={setAddr('postalCode')} />
                      <TextAreaField label="Full address" name="line1" required rows={2} placeholder="House, road, block, landmark" value={address.line1} onChange={setAddr('line1')} error={errors.line1} className="sm:col-span-2" />
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700 sm:col-span-2"><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} className="h-4 w-4 accent-emerald-700" /> Save this address to my account</label>
                    </div>
                  )}
                  <TextAreaField label="Delivery instructions (optional)" name="instructions" rows={2} placeholder="e.g. Call before delivery" value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-5" />
                  <div className="mt-6 flex justify-between gap-3">
                    <button type="button" onClick={() => go(0)} className={`${btn.ghost} h-12`}><ArrowLeft size={17} /> Back</button>
                    <button type="submit" className={`${btn.primary} h-12`}>Review order <ArrowRight size={17} /></button>
                  </div>
                </form>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard title="Review your order" icon={Truck}>
                <ul className="divide-y divide-stone-100 rounded-2xl ring-1 ring-stone-200/80">
                  {(quote?.lines ?? []).map((line) => (
                    <li key={line.product} className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100"><ProductImage src={line.image} alt={line.name ?? 'Product'} /></div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold text-stone-900">{line.name ?? 'Unavailable product'}</p>
                        <p className="text-stone-500">{line.quantity} × {money(line.price ?? 0)}</p>
                        {line.status !== 'ok' && <p className="font-medium text-rose-700">{line.message}</p>}
                      </div>
                      <p className="font-semibold text-stone-900 tabular-nums">{money(line.total ?? 0)}</p>
                    </li>
                  ))}
                </ul>
                {quote && !quote.canCheckout && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">Some items are unavailable. <Link to="/cart" className="font-semibold underline">Update your cart</Link> to continue.</p>}
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {methods.length > 0 && (
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-semibold text-stone-700">Delivery method</span>
                      <select value={shippingMethod} onChange={(event) => cart.setShippingMethod(event.target.value)} className="h-12 w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-700">
                        {methods.map((method) => <option key={method.id} value={method.id}>{method.name} — {method.charge ? money(method.charge) : 'Free'}{method.estimatedDelivery ? ` (${method.estimatedDelivery})` : ''}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="text-sm"><span className="mb-1.5 block font-semibold text-stone-700">Coupon</span><CouponField quote={quote} /></div>
                </div>
                <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm">
                  <p className="font-semibold text-stone-900">Delivering to</p>
                  <p className="mt-1 text-stone-700">{chosen?.name} · {chosen?.phone}</p>
                  <p className="text-stone-500">{chosen && describe(chosen)}</p>
                  {instructions && <p className="mt-1 text-stone-500">Note: {instructions}</p>}
                  <button type="button" onClick={() => go(1)} className="mt-2 cursor-pointer text-sm font-semibold text-emerald-800 hover:underline">Change</button>
                </div>
                <div className="mt-6 flex justify-between gap-3">
                  <button type="button" onClick={() => go(1)} className={`${btn.ghost} h-12`}><ArrowLeft size={17} /> Back</button>
                  <button type="button" disabled={!quote?.canCheckout || quoting} onClick={() => go(3)} className={`${btn.primary} h-12`}>Continue to payment <ArrowRight size={17} /></button>
                </div>
              </StepCard>
            )}

            {step >= 3 && (
              <StepCard title="Payment method" icon={CreditCard}>
                <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                  <label className="flex cursor-pointer gap-4 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-700">
                    <input type="radio" name="payment" checked readOnly className="mt-1 accent-emerald-700" />
                    <span><span className="flex items-center gap-2 font-semibold text-stone-900"><Banknote size={18} className="text-emerald-700" /> Cash on delivery</span><span className="mt-1 block text-sm text-stone-600">Pay in cash when your order arrives.</span></span>
                  </label>
                  <div className="flex gap-4 rounded-2xl p-5 opacity-60 ring-1 ring-stone-200" aria-disabled="true">
                    <input type="radio" name="payment" disabled className="mt-1" />
                    <span><span className="flex items-center gap-2 font-semibold text-stone-900"><CreditCard size={18} /> Online payment</span><span className="mt-1 block text-sm text-stone-600">Not available yet.</span></span>
                  </div>
                </div>
                <p className="mt-6 text-xs text-stone-500">By placing your order you confirm your details are correct. Prices, offers and stock are verified when the order is placed.</p>
                <div className="mt-6 flex justify-between gap-3">
                  <button type="button" disabled={placing} onClick={() => go(2)} className={`${btn.ghost} h-12`}><ArrowLeft size={17} /> Back</button>
                  <button type="button" disabled={placing || !quote?.canCheckout} onClick={() => { setStep(4); placeOrder(); }} className={`${btn.primary} h-13 px-8 text-base`}>
                    <Lock size={17} /> {placing ? 'Placing your order…' : `Place order · ${quote ? money(quote.totals.grandTotal) : ''}`}
                  </button>
                </div>
              </StepCard>
            )}
          </div>

          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-stone-200/80">
              <h2 className="font-serif text-xl font-semibold text-emerald-950">Order summary</h2>
              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {cart.items.map((item) => (
                  <li key={item.product} className="flex items-center gap-3 text-sm">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100"><ProductImage src={item.image} alt={item.name} /><span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white">{item.quantity}</span></div>
                    <span className="line-clamp-2 flex-1 text-stone-700">{item.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-stone-100 pt-5"><Totals quote={quote} loading={quoting} /></div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
