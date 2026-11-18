'use client';

import { useCallback, useRef, useState } from 'react';
import { Link } from '@/router';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Leaf, ShieldCheck, Sparkles, Star, Tag, Truck } from 'lucide-react';
import { money } from '../../lib/format.js';
import { Container, ProductImage } from './ui.jsx';

/*
 * Slide tones. `brand` uses emerald-*, which the storefront theme re-points, so slides follow
 * the theme picked in Settings → Branding. `warm` is for offers; `fresh` for new arrivals.
 */
const TONES = {
  brand: { bg: 'from-emerald-50 via-white to-emerald-100/70', blob: 'bg-emerald-200/60', blob2: 'bg-emerald-100', pill: 'text-emerald-800 ring-emerald-200' },
  warm: { bg: 'from-amber-50 via-orange-50/60 to-amber-100/80', blob: 'bg-amber-200/60', blob2: 'bg-orange-100', pill: 'text-amber-800 ring-amber-200' },
  fresh: { bg: 'from-lime-50 via-white to-emerald-50', blob: 'bg-lime-200/50', blob2: 'bg-emerald-100', pill: 'text-emerald-800 ring-lime-200' },
};
const CATEGORY_TONES = ['brand', 'fresh', 'warm'];

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
  if (data.slides?.length) return data.slides.map((slide) => ({ ...slide, kind: 'image', label: slide.title }));
  const slides = [];
  if (data.onSale?.length) {
    const best = Math.max(...data.onSale.map((product) => Math.round(product.discountPercentage || 0)));
    slides.push({
      id: 'offers', kind: 'products', tone: 'warm', icon: Tag, eyebrow: 'Special offers', label: 'Offers',
      title: best > 0 ? `Save up to ${best}% on natural favourites` : 'Special prices on natural favourites',
      subtitle: 'Limited-time prices on selected products. Pay in cash when your order arrives.',
      link: '/products?onSale=true', buttonText: 'Shop offers',
      products: [...data.onSale].sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0)).slice(0, 3),
    });
  }
  if (data.newArrivals?.length) {
    slides.push({
      id: 'new', kind: 'products', tone: 'fresh', icon: Sparkles, eyebrow: 'Just arrived', label: 'New arrivals',
      title: 'Fresh additions to our natural collection',
      subtitle: 'Discover the newest products on our shelves, picked for quality and purity.',
      link: '/products?sort=latest', buttonText: 'See what’s new', products: data.newArrivals.slice(0, 3),
    });
  }
  if (data.bestSelling?.length && slides.length < 3) {
    slides.push({
      id: 'best', kind: 'products', tone: 'brand', icon: Flame, eyebrow: 'Customer favourites', label: 'Best sellers',
      title: 'Loved by our customers, again and again',
      subtitle: 'The natural products people come back for.',
      link: '/products?sort=popular', buttonText: 'Shop best sellers', products: data.bestSelling.slice(0, 3),
    });
  }
  (data.categories ?? []).filter((category) => category.image).slice(0, 3).forEach((category, index) => {
    slides.push({
      id: `category-${category.id}`, kind: 'category', tone: CATEGORY_TONES[index % CATEGORY_TONES.length], icon: Leaf,
      eyebrow: `${category.productCount} product${category.productCount === 1 ? '' : 's'}`, label: category.name,
      title: category.name,
      subtitle: category.shortDescription || `Explore our ${category.name.toLowerCase()} collection.`,
      link: `/category/${category.slug}`, buttonText: `Shop ${category.name}`, image: category.image, count: category.productCount,
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

/** Staggered entrance for the active slide (restarts whenever the slide becomes active). */
// Inactive slides keep their content visible, so the outgoing slide fades out whole (no blank flash).
const enter = (active, delay) => (active ? { className: 'motion-safe:animate-fade-up', style: { animationDelay: `${delay}ms` } } : { className: '', style: undefined });

function SlideText({ slide, active, hidden }) {
  const Icon = slide.icon ?? Sparkles;
  const tone = TONES[slide.tone] ?? TONES.brand;
  const a = enter(active, 0);
  const b = enter(active, 90);
  const c = enter(active, 180);
  const d = enter(active, 270);
  return (
    <div className="flex max-w-xl flex-col items-start">
      {slide.eyebrow && (
        <p className={`inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[10.5px] font-bold tracking-widest uppercase shadow-sm ring-1 ${tone.pill} ${a.className}`} style={a.style}>
          <Icon size={13} /> {slide.eyebrow}
        </p>
      )}
      <h2 className={`mt-3 line-clamp-2 font-serif text-[1.65rem] leading-[1.1] font-semibold tracking-tight text-emerald-950 sm:text-4xl md:line-clamp-3 md:text-[2rem] lg:mt-4 lg:text-[2.6rem] ${b.className}`} style={b.style}>{slide.title}</h2>
      {slide.subtitle && <p className={`mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-stone-600 sm:text-base lg:mt-3 lg:text-lg ${c.className}`} style={c.style}>{slide.subtitle}</p>}
      <div className={`mt-4 flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:mt-7 ${d.className}`} style={d.style}>
        <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className="group/cta inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-900 active:scale-[0.98] sm:h-12 sm:flex-none sm:text-[15px]">
          {slide.buttonText || 'Shop now'} <ArrowRight size={17} className="transition group-hover/cta:translate-x-0.5" />
        </SmartLink>
        <Link to="/products" tabIndex={hidden ? -1 : undefined} draggable={false} className="hidden h-12 items-center rounded-full bg-white/80 px-6 text-[15px] font-semibold whitespace-nowrap text-emerald-900 ring-1 ring-emerald-900/10 transition hover:bg-white sm:inline-flex md:hidden lg:inline-flex">All products</Link>
      </div>
      <ul className={`mt-6 hidden items-center gap-5 text-[13px] font-medium whitespace-nowrap text-stone-600 xl:flex ${d.className}`} style={d.style}>
        <li className="flex items-center gap-1.5"><Truck size={16} className="text-emerald-700" /> Cash on delivery</li>
        <li className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-700" /> Quality checked</li>
      </ul>
    </div>
  );
}

/** Discount pill + name/price bar shown inside the bottom of a picture card. */
function InfoBar({ title, children, to, hidden }) {
  return (
    <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-3 rounded-2xl bg-white/92 px-3.5 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-md sm:inset-x-3 sm:bottom-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-stone-800 sm:text-sm">{title}</p>
        {children}
      </div>
      {to && <span aria-hidden="true" tabIndex={hidden ? -1 : undefined} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-800 text-white transition group-hover:translate-x-0.5 group-hover:bg-emerald-900"><ArrowRight size={16} /></span>}
    </div>
  );
}

/*
 * Picture area. The box is a size container, so the square card is as large as fits
 * (min of width and height) and never spills over the text or the controls.
 */
const PICTURE_BOX = 'flex h-full w-full items-center justify-center [container-type:size]';
const SQUARE = 'relative aspect-square w-[min(100cqw,100cqh)] shrink-0 overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-emerald-950/10 ring-1 ring-black/5';

/** Product slide: the top product as one large card (discount + name + price inside it). */
function ProductVisual({ products, active, hidden }) {
  const hero = products[0];
  if (!hero) return null;
  return (
    <div className={PICTURE_BOX}>
      <Link
        to={`/product/${hero.slug}`}
        tabIndex={hidden ? -1 : undefined}
        draggable={false}
        aria-label={`${hero.name}, ${money(hero.price)}`}
        className={`group ${SQUARE} ${active ? 'motion-safe:animate-hero-img' : ''}`}
      >
        <ProductImage src={hero.image} alt={hero.name} imgClassName="transition duration-700 group-hover:scale-105" />
        {hero.onSale && hero.discountPercentage > 0 && (
          <span className="absolute top-3 left-3 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-extrabold text-amber-950 shadow-md sm:text-sm">−{Math.round(hero.discountPercentage)}%</span>
        )}
        <InfoBar title={hero.name} to hidden={hidden}>
          <p className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-emerald-800 tabular-nums">{money(hero.price)}</span>
            {hero.onSale && <span className="text-xs text-stone-400 line-through tabular-nums">{money(hero.regularPrice)}</span>}
          </p>
        </InfoBar>
      </Link>
    </div>
  );
}

/** Category slide: the category photo with its product count inside the card. */
function CategoryVisual({ slide, active }) {
  return (
    <div className={PICTURE_BOX}>
      <div className={`group ${SQUARE} ${active ? 'motion-safe:animate-hero-img' : ''}`}>
        <img src={slide.image} alt="" draggable={false} className={`h-full w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} />
        <InfoBar title={slide.title}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-stone-500"><Star size={12} className="fill-amber-400 text-amber-400" /> <span className="tabular-nums">{slide.count}</span> products in this collection</p>
        </InfoBar>
      </div>
    </div>
  );
}

function Slide({ slide, active, first }) {
  const hidden = !active;
  const tone = TONES[slide.tone] ?? TONES.brand;

  // Admin-made image slides: full-bleed photo with a readable shade.
  if (slide.kind === 'image') {
    const t = enter(active, 0);
    return (
      <div className="absolute inset-0 bg-emerald-950">
        {slide.image && <img src={slide.image} alt="" draggable={false} loading={first ? 'eager' : 'lazy'} className={`absolute inset-0 h-full w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent sm:bg-gradient-to-r sm:from-black/70 sm:via-black/30" />
        <div className={`relative flex h-full max-w-xl flex-col items-start justify-end p-6 pb-16 text-white sm:justify-center sm:p-12 ${t.className}`} style={t.style}>
          <h2 className="line-clamp-2 font-serif text-3xl leading-tight font-semibold sm:text-5xl">{slide.title}</h2>
          {slide.subtitle && <p className="mt-3 line-clamp-2 text-white/85 sm:text-lg">{slide.subtitle}</p>}
          <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-emerald-950 shadow-lg transition hover:bg-emerald-50">{slide.buttonText || 'Shop now'} <ArrowRight size={17} /></SmartLink>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${tone.bg}`}>
      <div aria-hidden="true" className={`absolute top-1/2 right-[-10%] h-[120%] w-[70%] -translate-y-1/2 rounded-full blur-3xl ${tone.blob}`} />
      <div aria-hidden="true" className={`absolute -bottom-24 -left-20 h-72 w-72 rounded-full blur-3xl ${tone.blob2}`} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgba(6,78,59,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_right,black,transparent_60%)]" />
      {/* Phones: picture on top, text below. Desktop: text left, picture right. */}
      <div className="relative grid h-full grid-rows-[minmax(0,1fr)_auto] gap-3 px-5 pt-9 pb-14 sm:px-10 sm:pt-10 md:grid-cols-[1.05fr_1fr] md:grid-rows-1 md:items-center md:gap-6 md:pt-12 lg:gap-8 lg:px-14 lg:pt-8 lg:pb-20">
        <div className="min-h-0 md:order-2 md:h-[80%] lg:h-[84%]">
          {slide.kind === 'category' ? <CategoryVisual slide={slide} active={active} /> : <ProductVisual products={slide.products ?? []} active={active} hidden={hidden} />}
        </div>
        <div className="md:order-1"><SlideText slide={slide} active={active} hidden={hidden} /></div>
      </div>
    </div>
  );
}

/**
 * Home hero: light, theme-coloured slides that cross-fade with a staggered entrance.
 * Swipe/drag, autoplay with progress (pauses on hover, keyboard focus and while dragging),
 * arrows and keyboard. Desktop shows labelled tabs; phones show story-style progress bars.
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
      if (Math.abs(dx) > Math.min(70, g.width * 0.15)) go(index + (dx < 0 ? 1 : -1));
    }
    setDrag(null);
  }

  // Autoplay: the active progress bar's animation end advances the slide.
  const progress = (i) => (i === index ? (
    <span
      key={`${slides[i].id}-${index}`}
      onAnimationEnd={() => go(index + 1)}
      style={{ animationPlayState: paused ? 'paused' : 'running' }}
      className="absolute inset-0 origin-left rounded-full bg-emerald-700 motion-safe:animate-slide-progress"
    />
  ) : null);

  const arrow = 'grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/90 text-emerald-950 shadow-md ring-1 ring-black/5 backdrop-blur transition hover:bg-white active:scale-90';

  return (
    <section className="bg-gradient-to-b from-emerald-50/70 via-stone-50 to-white pt-3 pb-6 sm:pt-5 sm:pb-8 lg:pt-6 lg:pb-10">
      <Container className={`grid gap-3 sm:gap-4 ${promos.length ? 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <div
          className="group/slider relative overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-24px_rgba(6,78,59,0.35)] ring-1 ring-emerald-900/5 lg:rounded-[2rem]"
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
          {/* Slides are stacked and cross-fade; while dragging, the active one follows the finger a little. */}
          <div
            className={`relative h-[560px] touch-pan-y select-none sm:h-[520px] md:h-[440px] lg:h-[500px] ${count > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
          >
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== index}
                inert={i !== index}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
                style={i === index && drag !== null ? { transform: `translateX(${drag * 0.35}px)`, opacity: Math.max(0.55, 1 - Math.abs(drag) / 600) } : undefined}
              >
                <Slide slide={slide} active={i === index} first={i === 0} />
              </div>
            ))}
          </div>

          {count > 1 && (
            <>
              {/* Phones/tablets: story-style progress bars along the top */}
              <div className="absolute inset-x-5 top-3.5 z-20 flex gap-1.5 lg:hidden" role="tablist" aria-label="Choose slide">
                {slides.map((slide, i) => (
                  <button key={slide.id} type="button" role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}: ${slide.label ?? slide.title}`} onClick={() => go(i)} className="flex-1 cursor-pointer py-1.5">
                    <span className={`relative block h-1 overflow-hidden rounded-full ${i < index ? 'bg-emerald-700' : 'bg-emerald-900/15'}`}>{progress(i)}</span>
                  </button>
                ))}
              </div>

              {/* Desktop: labelled tabs along the bottom, arrows on the right */}
              <div className="absolute inset-x-0 bottom-0 z-20 hidden items-end gap-6 px-14 pb-6 lg:flex">
                <div className="flex min-w-0 flex-1 gap-5" role="tablist" aria-label="Choose slide">
                  {slides.map((slide, i) => (
                    <button key={slide.id} type="button" role="tab" aria-selected={i === index} onClick={() => go(i)} className="group min-w-0 flex-1 cursor-pointer text-left">
                      <span className={`relative block h-[3px] overflow-hidden rounded-full transition-colors ${i < index ? 'bg-emerald-700/70' : 'bg-emerald-900/10 group-hover:bg-emerald-900/20'}`}>{progress(i)}</span>
                      <span className={`mt-2 block truncate text-xs font-semibold transition-colors ${i === index ? 'text-emerald-900' : 'text-stone-500 group-hover:text-stone-800'}`}>{slide.label ?? slide.title}</span>
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className={arrow}><ChevronLeft size={19} /></button>
                  <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className={arrow}><ChevronRight size={19} /></button>
                </div>
              </div>

              {/* Phones: slide counter, bottom right */}
              <span className="absolute right-5 bottom-4 z-20 rounded-full bg-white/80 px-2.5 py-1 font-serif text-xs text-stone-500 tabular-nums shadow-sm ring-1 ring-black/5 backdrop-blur lg:hidden">
                <span className="text-emerald-900">{String(index + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}
              </span>
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
