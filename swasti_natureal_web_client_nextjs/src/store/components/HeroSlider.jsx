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
    <div className="grid grid-cols-3 items-center gap-2.5 sm:gap-5">
      {products.map((product, i) => (
        <Link key={product.id} to={`/product/${product.slug}`} tabIndex={hidden ? -1 : undefined} className={`group rounded-2xl bg-white p-1.5 shadow-xl shadow-black/30 ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 sm:rounded-3xl sm:p-3 sm:shadow-2xl ${positions[i] ?? ''}`}>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 sm:rounded-2xl">
            <ProductImage src={product.image} alt={product.name} imgClassName="transition duration-500 group-hover:scale-105" />
            {product.onSale && <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 sm:top-2 sm:left-2 sm:px-2 sm:text-xs">−{Math.round(product.discountPercentage)}%</span>}
          </div>
          <div className="px-0.5 pt-1.5 pb-0.5 sm:px-1 sm:pt-3 sm:pb-1">
            <p className="truncate text-[11px] font-semibold text-stone-900 sm:text-sm">{product.name}</p>
            <p className="mt-0.5 text-[11px] sm:text-sm">
              <span className="font-bold text-emerald-800">{money(product.price)}</span>
              {product.onSale && <span className="ml-1.5 hidden text-xs text-stone-400 line-through sm:inline">{money(product.regularPrice)}</span>}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoryVisual({ slide, active }) {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
      <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-black/30 ring-1 ring-white/20">
        <img src={slide.image} alt={slide.title} className={`aspect-[4/3] w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} />
      </div>
      <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Truck size={18} /></span>
        <div><p className="text-sm font-semibold text-stone-900">Cash on delivery</p><p className="text-xs text-stone-500">Delivered across Bangladesh</p></div>
      </div>
    </div>
  );
}

/** Primary + secondary call to action; full-width pair on phones, inline on larger screens. */
function Actions({ slide, hidden, secondary = true }) {
  return (
    <div className={`mt-6 grid gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 ${secondary ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
      <SmartLink to={slide.link} tabIndex={hidden ? -1 : undefined} className={`${btn.accent} h-12 px-5 text-[15px] shadow-lg shadow-amber-500/20 sm:h-13 sm:px-7 sm:text-base`}>
        <span className="truncate">{slide.buttonText || 'Shop now'}</span> <ArrowRight size={18} className="shrink-0" />
      </SmartLink>
      {secondary && <Link to="/products" tabIndex={hidden ? -1 : undefined} className="inline-flex h-12 items-center justify-center rounded-full px-5 text-[15px] font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 sm:h-13 sm:px-6 sm:text-base">All products</Link>}
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
        {/* Bottom-up shade on phones (text sits low), left-to-right shade on larger screens. */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/5 sm:bg-gradient-to-r sm:from-emerald-950/90 sm:via-emerald-950/55 sm:to-transparent" />
        <Container className="relative flex h-full items-end pb-20 sm:items-center sm:pb-0">
          <div key={active ? 'on' : 'off'} className="w-full max-w-xl text-white motion-safe:animate-fade-up">
            <h2 className="line-clamp-3 font-serif text-[1.85rem] leading-[1.12] font-semibold tracking-tight sm:text-5xl lg:text-6xl">{slide.title}</h2>
            {slide.subtitle && <p className="mt-3 line-clamp-2 text-[15px] text-emerald-50/85 sm:mt-4 sm:line-clamp-none sm:text-lg">{slide.subtitle}</p>}
            <Actions slide={slide} hidden={hidden} secondary={false} />
          </div>
        </Container>
      </>
    );
  }

  const theme = THEMES[slide.theme] ?? THEMES.emerald;
  const Icon = slide.icon ?? Sparkles;
  const isCategory = slide.kind === 'category';
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}>
      {/* Phones: category photo becomes a soft full-bleed backdrop instead of a side visual. */}
      {isCategory && slide.image && (
        <div className="absolute inset-0 sm:hidden" aria-hidden="true">
          <img src={slide.image} alt="" className={`h-full w-full object-cover ${active ? 'motion-safe:animate-ken-burns' : ''}`} loading={first ? 'eager' : 'lazy'} />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/75 to-emerald-950/20" />
        </div>
      )}
      <div aria-hidden="true" className={`absolute -top-32 -right-24 h-72 w-72 rounded-full blur-3xl sm:h-[28rem] sm:w-[28rem] ${theme.glow}`} />
      <div aria-hidden="true" className={`absolute -bottom-40 -left-20 h-72 w-72 rounded-full blur-3xl sm:h-96 sm:w-96 ${theme.glow2}`} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Container className={`relative grid h-full gap-6 pt-8 pb-20 sm:content-center sm:gap-8 sm:pt-12 sm:pb-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pt-0 lg:pb-16 ${isCategory ? 'content-end' : 'content-center'}`}>
        <div key={active ? 'on' : 'off'} className="max-w-xl text-white motion-safe:animate-fade-up">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-amber-200 uppercase ring-1 ring-white/15 backdrop-blur sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs"><Icon size={13} /> {slide.eyebrow}</p>
          <h2 className="mt-3 line-clamp-2 font-serif text-[1.85rem] leading-[1.1] font-semibold tracking-tight sm:mt-5 sm:line-clamp-none sm:text-5xl lg:text-6xl">{slide.title}</h2>
          <p className="mt-2.5 line-clamp-2 max-w-lg text-sm text-emerald-50/80 sm:mt-4 sm:line-clamp-none sm:text-lg">{slide.subtitle}</p>
          <Actions slide={slide} hidden={hidden} />
        </div>
        <div className={`w-full ${isCategory ? 'hidden sm:block' : ''}`}>
          {slide.kind === 'products' ? <ProductCollage products={slide.products} hidden={hidden} /> : <CategoryVisual slide={slide} active={active} />}
        </div>
      </Container>
    </div>
  );
}

/** Professional home slider: autoplay with progress (pauses on hover/focus/touch), arrows, dots, swipe, keyboard. */
export default function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const touch = useRef(null);
  const count = slides.length;
  const go = useCallback((next) => setIndex((next + count) % count), [count]);
  const paused = hovered || focused || touching;

  if (!count) return null;
  const current = slides[index];

  const arrowClass = 'pointer-events-auto hidden h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 sm:grid';

  return (
    <section
      className="relative overflow-hidden bg-emerald-950"
      aria-roledescription="carousel"
      aria-label="Highlights"
      // Pointer (not mouse) events: on touch screens mouseenter fires on tap and never "leaves",
      // which used to freeze autoplay after the first tap.
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
      onFocus={(event) => { if (event.target.matches(':focus-visible')) setFocused(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(index - 1);
        if (event.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(event) => {
        touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        setTouching(true);
      }}
      onTouchEnd={(event) => {
        setTouching(false);
        if (!touch.current) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        // Only horizontal swipes change slides, so vertical page scrolling is unaffected.
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
      onTouchCancel={() => { setTouching(false); touch.current = null; }}
    >
      <div className="relative h-[min(580px,calc(100svh-140px))] min-h-[500px] touch-pan-y sm:h-[580px] lg:h-[560px]">
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
          <Container className="flex items-center justify-between gap-4 pb-5 sm:pb-6">
            <div className="pointer-events-auto -ml-1 flex items-center" role="tablist" aria-label="Choose slide">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${slide.title}`}
                  onClick={() => go(i)}
                  // Generous invisible hit area (py/px) around a thin visual bar for easy tapping.
                  className="group cursor-pointer px-1 py-3"
                >
                  <span className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ${i === index ? 'w-10 bg-white/25 sm:w-12' : 'w-4 bg-white/35 group-hover:bg-white/60 sm:w-6'}`}>
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
            <div className="pointer-events-auto flex items-center gap-3 text-white">
              <span className="font-serif text-xs tabular-nums text-white/60 sm:text-sm"><span className="text-base text-white sm:text-lg">{String(index + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}</span>
              <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className={arrowClass}><ChevronLeft size={20} /></button>
              <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className={arrowClass}><ChevronRight size={20} /></button>
            </div>
          </Container>
        </div>
      )}
    </section>
  );
}
