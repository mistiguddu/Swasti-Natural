'use client';

import { useState } from 'react';
import { Link } from '@/router';
import { CheckCircle2, Compass, HandCoins, Leaf, Mail, MapPin, MessageCircle, PackageCheck, Phone, ShieldCheck, Truck } from 'lucide-react';
import { openChat } from '../components/ChatWidget.jsx';
import { storeApi } from '../api.js';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Container, PageHeader, TextAreaField, TextField, apiFieldErrors, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export function ContactPage() {
  usePageMeta('Contact us', 'Get in touch with us about orders, products or delivery.');
  const { info } = useStore();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const contact = info?.contact ?? {};
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email';
    if (form.message.trim().length < 10) local.message = 'Please write at least 10 characters';
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await storeApi.post('/store/contact', Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)));
      setSent(true);
      setForm(EMPTY);
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const channels = [
    contact.phone && { icon: Phone, label: 'Call us', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    contact.email && { icon: Mail, label: 'Email us', value: contact.email, href: `mailto:${contact.email}` },
    contact.address && { icon: MapPin, label: 'Visit us', value: contact.address },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Contact us" description="Questions about an order, a product or delivery? Send us a message and our team will get back to you." crumbs={[{ label: 'Contact' }]} />
      <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200/80 sm:p-8">
          {sent ? (
            <div className="py-10 text-center" role="status">
              <CheckCircle2 size={48} className="mx-auto text-emerald-700" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-emerald-950">Message sent</h2>
              <p className="mt-2 text-stone-600">Thank you for reaching out. We’ll reply as soon as we can.</p>
              <button type="button" onClick={() => setSent(false)} className={`${btn.secondary} mt-6 h-11`}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
              <h2 className="font-serif text-2xl font-semibold text-emerald-950 sm:col-span-2">Send us a message</h2>
              <TextField label="Your name" name="name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
              <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
              <TextField label="Mobile number" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
              <TextField label="Subject" name="subject" value={form.subject} onChange={set('subject')} error={errors.subject} />
              <TextAreaField label="Message" name="message" required rows={6} value={form.message} onChange={set('message')} error={errors.message} className="sm:col-span-2" />
              <div className="sm:col-span-2"><button type="submit" disabled={busy} className={`${btn.primary} h-12`}>{busy ? 'Sending…' : 'Send message'}</button></div>
            </form>
          )}
        </section>
        <aside className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white">
            <div aria-hidden="true" className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white/15 ring-1 ring-white/20"><MessageCircle size={20} /></span>
            <p className="relative mt-4 font-serif text-xl font-semibold">Prefer to chat?</p>
            <p className="relative mt-1 text-sm text-emerald-100/80">Message our team live — no account needed. Signed-in customers keep their chat history.</p>
            <button type="button" onClick={() => openChat()} className={`${btn.accent} relative mt-4 h-11`}>Start a chat</button>
          </div>
          {channels.length ? channels.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex gap-4 rounded-3xl bg-emerald-50/70 p-5 ring-1 ring-emerald-100">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-800 text-white"><Icon size={18} /></span>
              <div className="min-w-0"><p className="text-sm text-stone-500">{label}</p>{href ? <a href={href} className="font-semibold break-words text-emerald-950 hover:underline">{value}</a> : <p className="font-semibold text-emerald-950">{value}</p>}</div>
            </div>
          )) : <p className="rounded-3xl bg-stone-50 p-5 text-sm text-stone-600">Use the form to reach our team.</p>}
          <div className="rounded-3xl bg-stone-50 p-5 text-sm text-stone-600">
            <p className="font-semibold text-stone-900">Already ordered?</p>
            <p className="mt-1">You can check your order status any time.</p>
            <Link to="/track-order" className="mt-3 inline-flex font-semibold text-emerald-800 hover:underline">Track your order →</Link>
          </div>
        </aside>
      </Container>
    </>
  );
}

export function AboutPage() {
  const { info } = useStore();
  const name = info?.storeName ?? 'Swasti Natural';
  usePageMeta('About us', `Learn about ${name}.`);
  const promises = [
    { icon: Leaf, title: 'Natural focus', text: 'We curate natural and herbal products for everyday wellbeing.' },
    { icon: ShieldCheck, title: 'Clear information', text: 'Product details, ingredients and usage are shown as provided on each product page.' },
    { icon: HandCoins, title: 'Cash on delivery', text: 'Pay when your order arrives at your door.' },
    { icon: Truck, title: 'Delivery across Bangladesh', text: 'We deliver to all divisions and districts.' },
  ];
  return (
    <>
      <PageHeader title={`About ${name}`} description={info?.tagline} crumbs={[{ label: 'About us' }]} />
      <Container className="py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700 uppercase">Our story</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-emerald-950 sm:text-4xl">Natural care, delivered with honesty</h2>
          <p className="mt-5 text-lg leading-relaxed text-stone-600">{name} is an online store for natural and herbal products. We aim to make shopping simple: clear product information, fair prices and reliable delivery, with the option to pay in cash when your order arrives.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-emerald-50/60 p-6 ring-1 ring-emerald-100">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-emerald-800 ring-1 ring-emerald-100"><Icon size={22} /></span>
              <h3 className="mt-4 font-semibold text-emerald-950">{title}</h3>
              <p className="mt-1.5 text-sm text-stone-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center gap-4 rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 p-10 text-center text-white">
          <PackageCheck size={36} className="text-emerald-200" />
          <h2 className="font-serif text-3xl font-semibold">Ready to explore?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/products" className={`${btn.accent} h-12`}>Shop all products</Link>
            <Link to="/contact" className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/40 hover:bg-white/10">Contact us</Link>
          </div>
        </div>
      </Container>
    </>
  );
}

export function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <Container className="py-24 text-center">
      <Compass size={56} className="mx-auto text-emerald-700" />
      <h1 className="mt-6 font-serif text-4xl font-semibold text-emerald-950">Page not found</h1>
      <p className="mt-3 text-stone-600">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={`${btn.primary} h-12`}>Go home</Link>
        <Link to="/products" className={`${btn.secondary} h-12`}>Browse products</Link>
      </div>
    </Container>
  );
}
