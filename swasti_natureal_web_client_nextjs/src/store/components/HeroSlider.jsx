'use client';

import { useCallback, useRef, useState } from 'react';
import { Link } from '@/router';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Leaf, Sparkles, Tag, Truck } from 'lucide-react';
import { money } from '../../lib/format.js';
import { Container, ProductImage, btn } from './ui.jsx';

const THEMES = {
  emerald: { bg: 'from-emerald-950 via-emerald-900 to-emerald-700', glow: 'bg-emerald-300/25', glow2: 'bg-lime-300/15' },
  amber: { bg: 'from-stone-950 via-amber-950 to-amber-800', glow: 'bg-amber-300/25', glow2: 'bg-orange-300/15' },
  teal: { bg: 'from-teal-950 via-teal-900 to-emerald-800', glow: 'bg-teal-200/20', glow2: 'bg-emerald-300/15' },
};
const THEME_ORDER = ['teal', 'emerald', 'amber'];

const isExternal = (link) => /^https?:\/\//.test(link ?? '');
function SmartLink({ to, className, children, tabIndex }) {
  if (isExternal(to)) return <a href={to} className={className} target="_blank" rel="noreferrer" tabIndex={tabIndex} draggable={false}>{children}</a>;
  return <Link to={to || '/products'} className={className} tabIndex={tabIndex} draggable={false}>{children}</Link>;
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

/** Two promo tiles shown beside the slider (below it on phones), built from real store data. */
export function buildPromos(data) {
  const promos = [];
  if (data.onSale?.length) {
    const best = Math.max(...data.onSale.map((product) => Math.round(product.discountPercentage || 0)));
    promos.push({ id: 'sale', icon: Tag, tone: 'amber', eyebrow: 'Limited time', title: best > 0 ? `Up to ${best}% off` : 'Special offers', link: '/products?onSale=true', image: data.onSale[0].image });
  }
  if (data.bestSelling?.length) {
    promos.push({ id: 'best', icon: Flame, tone: 'rose', eyebrow: 'Top rated', title: 'Best sellers', link: '/products?sort=popular', image: data.bestSelling[0].image });
  }
  if (promos.length < 2 && data.newArrivals?.length) {
    promos.push({ id: 'new', icon: Sparkles, tone: 'emerald', eyebrow: 'Just in', title: 'New arrivals', link: '/products?sort=latest', image: data.newArrivals[0].image });
  }
  if (promos.length < 2 && data.featured?.length) {
    promos.push({ id: 'featured', icon: Leaf, tone: 'emerald', eyebrow: 'Handpicked', title: 'Featured picks', link: '/products?featured=true', image: data.featured[0].image });
  }
  return promos.slice(0, 2);
}

const PROMO_TONES = {
  amber: { card: 'from-amber-100 via-amber-50 to-orange-50 ring-amber-200/70', chip: 'text-amber-800' },
  rose: { card: 'from-rose-100 via-rose-50 to-orange-50 ring-rose-200/70', chip: 'text-rose-700' },
  emerald: { card: 'from-emerald-100 via-emerald-50 to-lime-50 ring-emerald-200/70', chip: 'text-emerald-800' },
};

function PromoTile({ promo }) {
  const Icon = promo.icon;
  const tone = PROMO_TONES[promo.tone] ?? PROMO_TONES.emerald;
  return (
    <Link to={promo.link} className={`group relative flex min-h-[124px] items-center overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 ring-1 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[150px] sm:p-5 lg:h-full lg:rounded-3xl lg:p-6 ${tone.card}`}>
      <div className="relative z-10 min-w-0 flex-1 pr-12 sm:pr-28 lg:pr-28">
        <span className={`inline-flex max-w-full items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase sm:text-[11px] ${tone.chip}`}><Icon size={12} className="shrink-0" /> <span className="truncate">{promo.eyebrow}</span></span>
        <p className="mt-2 font-serif text-lg leading-tight font-semibold text-stone-900 sm:text-2xl">{promo.title}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 sm:mt-3 sm:text-sm">Shop now <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
      </div>
      <div className="absolute top-1/2 -right-4 h-20 w-20 -translate-y-1/2 overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white/70 sm:right-4 sm:h-28 sm:w-28 lg:right-5 lg:h-32 lg:w-32">
        <ProductImage src={promo.image} alt="" imgClassName="transition duration-500 group-hover:scale-110" />
      </div>
    </Link>
  );
}

function ProductCollage({ products, hidden }) {
  const positions = ['lg:translate-y-8', 'z-10 lg:-translate-y-3 lg:scale-110', 'lg:translate-y-12'];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 lg:items-center">
      {products.map((product, i) => (
        <Link key={product.id} to={`/product/${product.slug}`} tabIndex={hidden ? -1 : undefined} draggable={false} className={`group rounded-2xl bg-white p-1.5 shadow-xl shadow-black/25 ring-1 ring-white/30 transition duration-300 hover:-translate-y-1 sm:p-2.5 lg:rounded-3xl ${positions[i] ?? ''}`}>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 lg:rounded-2xl">
            <ProductImage src={product.image} alt={product.name} imgClassName="transition duration-500 group-hover:scale-105" />
            {product.onSale && <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 sm:text-xs">−{Math.round(product.discountPercentage)}%</span>}
          </div>
          <div className="px-0.5 pt-1.5 pb-0.5 sm:px-1 sm:pt-2.5">
            <p className="truncate text-[11px] font-semibold text-stone-900 sm:text-sm">{product.name}</p>
            <p className="text-[11px] sm:text-sm">
              <span className="font-bold text-emerald-800">{money(product.price)}</span>
              {product.onSale && <span className="ml-1.5 hidden text-xs text-stone-400 line-through xl:inline">{money(product.regularPrice)}</span>}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SlideText({ slide, hidden, active, secondary = true }) {
  const Icon = slide.icon ?? Sparkles;
  return (
    <div key={active ? 'on' : 'off'} className="max-w-xl text-white motion-safe:animate-fade-up">
      {slide.eyebrow && <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-amber-200 uppercase ring-1 ring-white/15 backdrop-blur sm:text-[11px]"><Icon size={13} /> {slide.eyebrow}</p>}
      <h2 className="mt-3 line-clamp-2 font-serif text-[1.75rem] leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:mt-4 lg:line-clamp-3 lg:text-5xl">{slide.title}</h2>
      {slide.subtitle && <p className="mt-2.5 line-clamp-2 max-w-md text-sm text-white/80 sm:text-base lg:mt-4 lg:text-lg">{slide.subtitle}</p>}
      <div className="mt-5 flex flex-wrap gap-2.5 lg:mt-7">
        <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className={`${btn.accent} h-11 px-5 text-sm shadow-lg shadow-amber-500/25 sm:h-12 sm:px-6 sm:text-[15px]`}>
          {slide.buttonText || 'Shop now'} <ArrowRight size={17} />
        </SmartLink>
        {secondary && <Link to="/products" tabIndex={hidden ? -1 : undefined} draggable={false} className="hidden h-12 items-center rounded-full px-6 text-[15px] font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 sm:inline-flex">All products</Link>}
      </div>
    </div>
  );
}

function Slide({ slide, active, first }) {
  const hidden = !active;
  const theme = THEMES[slide.theme] ?? THEMES.emerald;

  // Admin-made image slides and category slides: full-bleed photo with a readable shade.
  if (slide.kind === 'image' || slide.kind === 'category') {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}>
        {slide.image && <img src={slide.image} alt="" draggable={false} loading={first ? 'eager' : 'lazy'} className={`absolute inset-0 h-full w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent sm:bg-gradient-to-r sm:from-black/75 sm:via-black/35 sm:to-transparent" />
        <div className="relative flex h-full items-end p-5 pb-14 sm:items-center sm:p-10 lg:p-14">
          <SlideText slide={slide} hidden={hidden} active={active} secondary={slide.kind === 'category'} />
        </div>
        {slide.kind === 'category' && (
          <div className="absolute top-5 right-5 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur md:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Truck size={17} /></span>
            <div><p className="text-sm font-semibold text-stone-900">Cash on delivery</p><p className="text-xs text-stone-500">All over Bangladesh</p></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}>
      <div aria-hidden="true" className={`absolute -top-24 -right-16 h-72 w-72 rounded-full blur-3xl lg:h-96 lg:w-96 ${theme.glow}`} />
      <div aria-hidden="true" className={`absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl ${theme.glow2}`} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="relative grid h-full grid-rows-[auto_1fr] gap-5 p-5 pb-14 sm:p-8 sm:pb-16 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1 lg:items-center lg:gap-10 lg:p-12">
        <SlideText slide={slide} hidden={hidden} active={active} />
        <div className="flex items-end lg:block">
          <div className="w-full"><ProductCollage products={slide.products} hidden={hidden} /></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Home hero: rounded card slider with finger-following swipe/drag, autoplay with progress
 * (pauses on mouse hover, keyboard focus and while dragging), arrows, dots, keyboard — plus promo tiles.
 */
export default function HeroSlider({ slides, promos = [] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [drag, setDrag] = useState(null); // px offset while dragging, null when idle
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const count = slides.length;
  const go = useCallback((next) => setIndex((next + count) % count), [count]);

  if (!count) return null;
  const current = slides[index];
  const paused = hovered || focused || drag !== null;

  function onPointerDown(event) {
    if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId, axis: null, width: event.currentTarget.offsetWidth };
    suppressClick.current = false;
  }
  function onPointerMove(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (g.axis === 'x') { suppressClick.current = true; setDrag(dx); }
  }
  function onPointerEnd(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.axis === 'x') {
      const dx = event.clientX - g.x;
      if (Math.abs(dx) > Math.min(80, g.width * 0.18)) go(index + (dx < 0 ? 1 : -1));
    }
    setDrag(null);
  }

  const arrow = 'pointer-events-auto grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/90 text-emerald-950 shadow-lg ring-1 ring-black/5 transition hover:scale-105 hover:bg-white';

  return (
    <section className="bg-gradient-to-b from-emerald-50/80 via-stone-50 to-white pt-3 pb-6 sm:pt-5 sm:pb-8 lg:pt-6 lg:pb-10">
      <Container className={`grid gap-3 sm:gap-4 ${promos.length ? 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <div
          className="group/slider relative overflow-hidden rounded-3xl bg-emerald-950 shadow-xl shadow-emerald-950/15 lg:rounded-[2rem]"
          aria-roledescription="carousel"
          aria-label="Highlights"
          onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
          onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
          onFocus={(event) => { if (event.target.matches(':focus-visible')) setFocused(true); }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') go(index - 1);
            if (event.key === 'ArrowRight') go(index + 1);
          }}
        >
          {/* Track: follows the finger/mouse while dragging, eases into place on release. */}
          <div
            className={`relative h-[470px] touch-pan-y select-none sm:h-[440px] lg:h-[480px] ${count > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
          >
            <div
              className={`flex h-full ${drag === null ? 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''}`}
              style={{ transform: `translateX(calc(${-index * 100}% + ${drag ?? 0}px))` }}
            >
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={i !== index}
                  inert={i !== index}
                  className="relative h-full w-full shrink-0 overflow-hidden"
                >
                  <Slide slide={slide} active={i === index} first={i === 0} />
                </div>
              ))}
            </div>
          </div>

          {count > 1 && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-4 left-4 z-20 hidden items-center justify-between opacity-0 transition duration-300 group-focus-within/slider:opacity-100 group-hover/slider:opacity-100 sm:flex">
                <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className={arrow}><ChevronLeft size={20} /></button>
                <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className={arrow}><ChevronRight size={20} /></button>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-4 pb-2 sm:px-8 sm:pb-3 lg:px-12">
                <div className="pointer-events-auto -ml-1 flex items-center" role="tablist" aria-label="Choose slide">
                  {slides.map((slide, i) => (
                    <button key={slide.id} type="button" role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}: ${slide.title}`} onClick={() => go(i)} className="group cursor-pointer px-1 py-3">
                      <span className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ${i === index ? 'w-10 bg-white/25 sm:w-12' : 'w-1.5 bg-white/45 group-hover:bg-white/70 sm:w-6'}`}>
                        {i === index && (
                          <span
                            key={`${current.id}-${index}`}
                            onAnimationEnd={() => go(index + 1)}
                            // Inline so it overrides the animation shorthand (pausing also pauses autoplay).
                            style={{ animationPlayState: paused ? 'paused' : 'running' }}
                            className="absolute inset-0 origin-left rounded-full bg-amber-300 motion-safe:animate-slide-progress"
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-black/25 px-2.5 py-1 font-serif text-xs tabular-nums text-white/70 backdrop-blur">
                  <span className="text-white">{String(index + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}
                </span>
              </div>
            </>
          )}
        </div>

        {promos.length > 0 && (
          <div className={`grid gap-3 sm:gap-4 lg:grid-cols-1 lg:grid-rows-2 ${promos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {promos.map((promo) => <PromoTile key={promo.id} promo={promo} />)}
          </div>
        )}
      </Container>
    </section>
  );
}
