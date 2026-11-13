'use client';

import { Link } from '@/router';
import { ArrowRight, Headset, Leaf, Quote, ShieldCheck, Sprout } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useBranding } from '../../context/BrandingContext.jsx';
import { Container, ErrorBlock, ProductImage, SectionHeading, Skel, Stars } from '../components/ui.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import HeroSlider, { buildSlides } from '../components/HeroSlider.jsx';
import { usePageMeta } from '../lib/helpers.js';

const isExternal = (link) => /^https?:\/\//.test(link ?? '');
function SmartLink({ to, className, children }) {
  if (!to) return <Link to="/products" className={className}>{children}</Link>;
  return isExternal(to) ? <a href={to} className={className} target="_blank" rel="noreferrer">{children}</a> : <Link to={to} className={className}>{children}</Link>;
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
      <Skel className="h-[min(580px,calc(100svh-140px))] min-h-[500px] w-full rounded-none sm:h-[580px] lg:h-[560px]" />
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
      <h1 className="sr-only">{storeName} — natural products delivered across Bangladesh</h1>
      <HeroSlider slides={buildSlides(data)} />
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
