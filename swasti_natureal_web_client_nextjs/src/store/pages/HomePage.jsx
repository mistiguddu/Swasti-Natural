'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/router';
import { ArrowRight, ChevronLeft, ChevronRight, Headset, Leaf, Quote, ShieldCheck, Sprout } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useBranding } from '../../context/BrandingContext.jsx';
import { Container, ErrorBlock, ProductImage, SectionHeading, Skel, Stars, btn } from '../components/ui.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { usePageMeta } from '../lib/helpers.js';

const isExternal = (link) => /^https?:\/\//.test(link ?? '');
function SmartLink({ to, className, children }) {
  if (!to) return <Link to="/products" className={className}>{children}</Link>;
  return isExternal(to) ? <a href={to} className={className} target="_blank" rel="noreferrer">{children}</a> : <Link to={to} className={className}>{children}</Link>;
}

/** Hero: admin-managed slides (Marketing → Sliders); a branded hero when none exist. */
function Hero({ slides }) {
  const { storeName, logoUrl } = useBranding();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50/60">
        <div aria-hidden="true" className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold tracking-widest text-emerald-800 uppercase shadow-sm ring-1 ring-emerald-900/10"><Leaf size={14} /> Natural wellness</p>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] font-semibold tracking-tight text-emerald-950 sm:text-6xl">Pure, natural care — delivered to your door.</h1>
            <p className="mt-5 max-w-lg text-lg text-stone-600">Discover {storeName}’s collection of natural products, carefully selected for everyday wellbeing.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className={`${btn.primary} h-13 text-base`}>Shop now <ArrowRight size={18} /></Link>
              <Link to="/categories" className={`${btn.secondary} h-13 text-base`}>Browse categories</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-200/70 to-amber-100 blur-2xl" aria-hidden="true" />
            <div className="relative grid aspect-square place-items-center rounded-full bg-white/80 p-10 shadow-xl ring-1 ring-emerald-900/5 backdrop-blur">
              <img src={logoUrl} alt={storeName} className="max-h-full w-auto object-contain" />
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const slide = slides[index];
  return (
    <section className="relative" aria-roledescription="carousel" aria-label="Featured">
      <div className="relative h-[460px] overflow-hidden bg-emerald-950 sm:h-[540px]">
        {slides.map((item, i) => (
          <div key={item.id} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== index}>
            {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} /> : <div className="h-full w-full bg-gradient-to-br from-emerald-800 to-emerald-950" />}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-950/45 to-transparent" />
          </div>
        ))}
        <Container className="relative flex h-full items-center">
          <div key={slide.id} className="max-w-xl text-white motion-safe:animate-fade-up">
            <h1 className="font-serif text-4xl leading-tight font-semibold sm:text-6xl">{slide.title}</h1>
            {slide.subtitle && <p className="mt-4 text-lg text-emerald-50/90">{slide.subtitle}</p>}
            <SmartLink to={slide.link} className={`${btn.accent} mt-8 h-13 text-base`}>{slide.buttonText || 'Shop now'} <ArrowRight size={18} /></SmartLink>
          </div>
        </Container>
        {slides.length > 1 && (
          <>
            <button type="button" aria-label="Previous slide" onClick={() => setIndex((index - 1 + slides.length) % slides.length)} className="absolute top-1/2 left-4 hidden h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 sm:grid"><ChevronLeft /></button>
            <button type="button" aria-label="Next slide" onClick={() => setIndex((index + 1) % slides.length)} className="absolute top-1/2 right-4 hidden h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 sm:grid"><ChevronRight /></button>
            <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
              {slides.map((item, i) => <button key={item.id} type="button" aria-label={`Slide ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className={`h-2 cursor-pointer rounded-full transition-all ${i === index ? 'w-8 bg-amber-300' : 'w-2 bg-white/60'}`} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Categories({ categories }) {
  if (!categories.length) return null;
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Shop by category" title="Find what you need" action={<Link to="/categories" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline">All categories <ArrowRight size={15} /></Link>} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-emerald-900 ring-1 ring-emerald-900/10">
              <ProductImage src={category.image || category.thumbnail} alt={category.name} imgClassName="opacity-90 transition duration-700 group-hover:scale-105" className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <h3 className="font-serif text-lg font-semibold text-white sm:text-xl">{category.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-50/85">{category.productCount} products <ArrowRight size={13} className="transition group-hover:translate-x-1" /></p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProductSection({ eyebrow, title, description, products, link, tone = 'white' }) {
  if (!products.length) return null;
  return (
    <section className={`py-16 sm:py-20 ${tone === 'tint' ? 'bg-stone-50' : ''}`}>
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} description={description} action={link && <Link to={link} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline">View all <ArrowRight size={15} /></Link>} />
        <ProductGrid products={products} />
      </Container>
    </section>
  );
}

function Banners({ banners }) {
  if (!banners.length) return null;
  return (
    <section className="py-6">
      <Container className={`grid gap-5 ${banners.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {banners.slice(0, 2).map((banner) => (
          <SmartLink key={banner.id} to={banner.link} className="group relative flex min-h-56 overflow-hidden rounded-3xl bg-emerald-900">
            {banner.image && <img src={banner.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 to-emerald-950/10" />
            <div className="relative max-w-sm self-end p-7 text-white sm:p-9">
              <h3 className="font-serif text-2xl font-semibold sm:text-3xl">{banner.title}</h3>
              {banner.subtitle && <p className="mt-2 text-emerald-50/90">{banner.subtitle}</p>}
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-amber-300">{banner.buttonText || 'Shop now'} <ArrowRight size={16} /></span>
            </div>
          </SmartLink>
        ))}
      </Container>
    </section>
  );
}

const PROMISES = [
  { icon: Sprout, title: 'Quality products', text: 'Carefully selected products, checked before they reach you.' },
  { icon: Leaf, title: 'Natural ingredients', text: 'A focus on natural, thoughtfully made everyday care.' },
  { icon: ShieldCheck, title: 'Secure shopping', text: 'Protected accounts and cash on delivery — pay when it arrives.' },
  { icon: Headset, title: 'Customer support', text: 'Questions about an order? Our team is here to help.' },
];

function WhyChoose({ storeName }) {
  return (
    <section className="bg-emerald-950 py-16 text-white sm:py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-300 uppercase">Why choose us</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Why shop with {storeName}</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-white/5 p-7 ring-1 ring-white/10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/15 text-amber-300"><Icon size={22} /></span>
              <h3 className="mt-5 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50/70">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ items }) {
  if (!items.length) return null;
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Customer reviews" title="What our customers say" className="text-left" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((review) => (
            <figure key={review.id} className="flex flex-col rounded-3xl bg-stone-50 p-7 ring-1 ring-stone-200/70">
              <Quote size={28} className="text-emerald-700/30" />
              <Stars value={review.rating} className="mt-3" />
              {review.title && <p className="mt-3 font-semibold text-emerald-950">{review.title}</p>}
              <blockquote className="mt-2 line-clamp-5 flex-1 text-stone-700">“{review.comment}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-stone-900">{review.author}</span>
                <span className="text-stone-500"> on </span>
                <Link to={`/product/${review.product.slug}`} className="font-medium text-emerald-800 hover:underline">{review.product.name}</Link>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skel className="h-[460px] w-full rounded-none sm:h-[540px]" />
      <Container className="py-16">
        <Skel className="h-8 w-64" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skel key={i} className="aspect-[4/3] rounded-3xl" />)}</div>
        <Skel className="mt-16 h-8 w-64" />
        <ProductGrid loading className="mt-8" />
      </Container>
    </div>
  );
}

export default function HomePage() {
  const { storeName } = useBranding();
  usePageMeta(null, `Shop natural wellness products from ${storeName}. Cash on delivery across Bangladesh.`);
  const { data, loading, error, reload } = useApi(() => storeApi.get('/store/home'), []);
  if (loading) return <HomeSkeleton />;
  if (error) return <Container className="py-16"><ErrorBlock error={error} onRetry={reload} /></Container>;

  const nothingYet = !data.featured.length && !data.newArrivals.length && !data.bestSelling.length;
  return (
    <>
      <Hero slides={data.slides} />
      <Categories categories={data.categories} />
      <ProductSection eyebrow="Handpicked" title="Featured products" products={data.featured} link="/products?featured=true" tone="tint" />
      <ProductSection eyebrow="Just in" title="New arrivals" products={data.newArrivals} link="/products?sort=latest" />
      <Banners banners={data.banners} />
      <ProductSection eyebrow="Customer favourites" title="Best selling" products={data.bestSelling} link="/products?sort=popular" tone="tint" />
      <ProductSection eyebrow="Limited time" title="Special offers" description="Save on selected products while offers last." products={data.onSale} link="/products?onSale=true" />
      {nothingYet && (
        <Container className="py-16 text-center text-stone-600">Our shelves are being stocked — please check back soon.</Container>
      )}
      <WhyChoose storeName={storeName} />
      <Testimonials items={data.testimonials} />
    </>
  );
}
