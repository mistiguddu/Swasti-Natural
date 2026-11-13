'use client';

import { useCallback, useRef, useState } from 'react';
import { Link } from '@/router';
import { ArrowRight, ChevronLeft, ChevronRight, Leaf, Sparkles, Tag, Truck } from 'lucide-react';
import { money } from '../../lib/format.js';
import { Container, ProductImage, btn } from './ui.jsx';

const THEMES = {
  emerald: { bg: 'from-emerald-950 via-emerald-900 to-emerald-800', glow: 'bg-emerald-400/20', glow2: 'bg-lime-300/10' },
  amber: { bg: 'from-stone-950 via-amber-950 to-amber-900', glow: 'bg-amber-400/20', glow2: 'bg-orange-300/10' },
  teal: { bg: 'from-teal-950 via-teal-900 to-emerald-900', glow: 'bg-teal-300/20', glow2: 'bg-emerald-300/10' },
};
const THEME_ORDER = ['teal', 'emerald', 'amber'];

const isExternal = (link) => /^https?:\/\//.test(link ?? '');
function SmartLink({ to, className, children, tabIndex }) {
  if (isExternal(to)) return <a href={to} className={className} target="_blank" rel="noreferrer" tabIndex={tabIndex}>{children}</a>;
  return <Link to={to || '/products'} className={className} tabIndex={tabIndex}>{children}</Link>;
}

/**
 * Slides come from Marketing → Sliders in the admin. Until any exist, they are built from
 * real store data (offers, new arrivals, top categories) — nothing is invented.
 */
export function buildSlides(data) {
  if (data.slides?.length) return data.slides.map((slide) => ({ ...slide, kind: 'image' }));
  const slides = [];
  if (data.onSale?.length) {
    const best = Math.max(...data.onSale.map((product) => Math.round(product.discountPercentage || 0)));
    slides.push({
      id: 'offers', kind: 'products', theme: 'amber', icon: Tag, eyebrow: 'Special offers',
      title: best > 0 ? `Save up to ${best}% on natural favourites` : 'Special prices on natural favourites',
      subtitle: 'Limited-time prices on selected products. Pay in cash when your order arrives.',
      link: '/products?onSale=true', buttonText: 'Shop offers', products: data.onSale.slice(0, 3),
    });
  }
  if (data.newArrivals?.length) {
    slides.push({
      id: 'new', kind: 'products', theme: 'emerald', icon: Sparkles, eyebrow: 'Just arrived',
      title: 'Fresh additions to our natural collection',
      subtitle: 'Discover the newest products on our shelves.',
      link: '/products?sort=latest', buttonText: 'See what’s new', products: data.newArrivals.slice(0, 3),
    });
  }
  (data.categories ?? []).filter((category) => category.image).slice(0, 3).forEach((category, index) => {
    slides.push({
      id: `category-${category.id}`, kind: 'category', theme: THEME_ORDER[index % THEME_ORDER.length], icon: Leaf,
      eyebrow: `${category.productCount} product${category.productCount === 1 ? '' : 's'}`,
      title: category.name,
      subtitle: category.shortDescription || `Explore our ${category.name.toLowerCase()} collection.`,
      link: `/category/${category.slug}`, buttonText: `Shop ${category.name}`, image: category.image,
    });
  });
  return slides;
}

function ProductCollage({ products, hidden }) {
  const positions = ['lg:translate-y-10', 'z-10 lg:-translate-y-4 lg:scale-110', 'lg:translate-y-14'];
  return (
    <div className="grid grid-cols-3 items-center gap-3 sm:gap-5">
      {products.map((product, i) => (
        <Link key={product.id} to={`/product/${product.slug}`} tabIndex={hidden ? -1 : undefined} className={`group rounded-3xl bg-white p-2 shadow-2xl shadow-black/30 ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 sm:p-3 ${positions[i] ?? ''}`}>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
            <ProductImage src={product.image} alt={product.name} imgClassName="transition duration-500 group-hover:scale-105" />
            {product.onSale && <span className="absolute top-2 left-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 sm:text-xs">−{Math.round(product.discountPercentage)}%</span>}
          </div>
          <div className="hidden px-1 pt-3 pb-1 sm:block">
            <p className="truncate text-sm font-semibold text-stone-900">{product.name}</p>
            <p className="mt-0.5 text-sm">
              <span className="font-bold text-emerald-800">{money(product.price)}</span>
              {product.onSale && <span className="ml-1.5 text-xs text-stone-400 line-through">{money(product.regularPrice)}</span>}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoryVisual({ slide, active }) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-black/30 ring-1 ring-white/20">
        <img src={slide.image} alt={slide.title} className={`aspect-[4/3] w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} />
      </div>
      <div className="absolute -bottom-5 left-6 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl sm:flex">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Truck size={18} /></span>
        <div><p className="text-sm font-semibold text-stone-900">Cash on delivery</p><p className="text-xs text-stone-500">Delivered across Bangladesh</p></div>
      </div>
    </div>
  );
}

function Slide({ slide, active, first }) {
  const hidden = !active;
  if (slide.kind === 'image') {
    return (
      <>
        {slide.image
          ? <img src={slide.image} alt="" className={`absolute inset-0 h-full w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} loading={first ? 'eager' : 'lazy'} />
          : <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 to-emerald-950" />}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/55 to-transparent" />
        <Container className="relative flex h-full items-center">
          <div key={active ? 'on' : 'off'} className="max-w-xl text-white motion-safe:animate-fade-up">
            <h2 className="font-serif text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">{slide.title}</h2>
            {slide.subtitle && <p className="mt-4 text-lg text-emerald-50/85">{slide.subtitle}</p>}
            <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className={`${btn.accent} mt-8 h-13 text-base`}>{slide.buttonText || 'Shop now'} <ArrowRight size={18} /></SmartLink>
          </div>
        </Container>
      </>
    );
  }

  const theme = THEMES[slide.theme] ?? THEMES.emerald;
  const Icon = slide.icon ?? Sparkles;
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}>
      <div aria-hidden="true" className={`absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl ${theme.glow}`} />
      <div aria-hidden="true" className={`absolute -bottom-40 -left-20 h-96 w-96 rounded-full blur-3xl ${theme.glow2}`} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Container className="relative grid h-full content-center gap-8 py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:py-0">
        <div key={active ? 'on' : 'off'} className="max-w-xl text-white motion-safe:animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-amber-200 uppercase ring-1 ring-white/15 backdrop-blur"><Icon size={14} /> {slide.eyebrow}</p>
          <h2 className="mt-5 font-serif text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl">{slide.title}</h2>
          <p className="mt-4 max-w-lg text-base text-emerald-50/80 sm:text-lg">{slide.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className={`${btn.accent} h-12 text-base sm:h-13`}>{slide.buttonText} <ArrowRight size={18} /></SmartLink>
            <Link to="/products" tabIndex={hidden ? -1 : undefined} className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 sm:h-13">All products</Link>
          </div>
        </div>
        <div className={`w-full ${slide.kind === 'category' ? 'hidden sm:block' : ''}`}>
          {slide.kind === 'products' ? <ProductCollage products={slide.products} hidden={hidden} /> : <CategoryVisual slide={slide} active={active} />}
        </div>
      </Container>
    </div>
  );
}

/** Professional home slider: autoplay with progress (pauses on hover/focus), arrows, dots, swipe, keyboard. */
export default function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = slides.length;
  const go = useCallback((next) => setIndex((next + count) % count), [count]);

  if (!count) return null;
  const current = slides[index];

  return (
    <section
      className="relative overflow-hidden bg-emerald-950"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(index - 1);
        if (event.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchX.current == null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative h-[640px] sm:h-[600px] lg:h-[560px]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
          >
            <Slide slide={slide} active={i === index} first={i === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <Container className="flex items-center justify-between gap-4 pb-6">
            <div className="pointer-events-auto flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${slide.title}`}
                  onClick={() => go(i)}
                  className={`relative h-1.5 cursor-pointer overflow-hidden rounded-full transition-all duration-300 ${i === index ? 'w-12 bg-white/25' : 'w-6 bg-white/30 hover:bg-white/50'}`}
                >
                  {i === index && (
                    <span
                      key={`${current.id}-${index}`}
                      onAnimationEnd={() => go(index + 1)}
                      className={`absolute inset-0 origin-left rounded-full bg-amber-300 motion-safe:animate-slide-progress ${paused ? '[animation-play-state:paused]' : ''}`}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-3 text-white">
              <span className="hidden font-serif text-sm tabular-nums text-white/70 sm:inline"><span className="text-lg text-white">{String(index + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}</span>
              <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"><ChevronLeft size={20} /></button>
              <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"><ChevronRight size={20} /></button>
            </div>
          </Container>
        </div>
      )}
    </section>
  );
}
