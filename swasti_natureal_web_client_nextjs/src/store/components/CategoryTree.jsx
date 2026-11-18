'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, ShallowLink } from '@/router';
import { ChevronDown, ChevronLeft, FolderTree, LayoutGrid, Package, Truck } from 'lucide-react';
import { Container, ProductImage } from './ui.jsx';

/** Builds lookup helpers for the flat category list from /store/categories. */
export function useCategoryIndex(categories) {
  return useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const children = new Map();
    for (const category of categories) {
      const key = category.parent ?? 'root';
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(category);
    }
    const roots = children.get('root') ?? [];
    const ancestors = (category) => {
      const chain = [];
      let parent = category && byId.get(category.parent);
      while (parent && !chain.includes(parent)) { chain.unshift(parent); parent = byId.get(parent.parent); }
      return chain;
    };
    return {
      byId, bySlug, roots, ancestors,
      childrenOf: (id) => children.get(id) ?? [],
      total: roots.reduce((sum, category) => sum + (category.productCount ?? 0), 0),
    };
  }, [categories]);
}

/** Keeps sort and view when switching category; resets page and other filters. */
export function categoryTarget(slug, params) {
  const keep = new URLSearchParams();
  for (const key of ['sort', 'view']) if (params?.get(key)) keep.set(key, params.get(key));
  return { pathname: slug ? `/category/${slug}` : '/products', search: keep.toString() };
}

function CountBadge({ value, active }) {
  return (
    <span className={`ml-auto min-w-7 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums transition-colors ${active ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500 group-hover:bg-white group-hover:text-stone-700'}`}>
      {value}
    </span>
  );
}

/** Thin bar on the left edge of the active row. */
function ActiveBar({ active }) {
  return <span aria-hidden="true" className={`absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600 transition-all duration-300 ${active ? 'opacity-100' : 'scale-y-0 opacity-0'}`} />;
}

function TreeNode({ category, depth, index, activeSlug, expanded, toggle, params, onNavigate }) {
  const kids = index.childrenOf(category.id);
  const active = category.slug === activeSlug;
  const open = expanded.has(category.id);
  const root = depth === 0;
  return (
    <li>
      <div className={`group relative flex items-center rounded-xl transition-colors duration-200 ${active ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}>
        <ActiveBar active={active} />
        <ShallowLink
          to={categoryTarget(category.slug, params)}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pl-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${kids.length ? 'pr-1' : 'pr-2.5'} ${root ? 'min-h-11' : 'min-h-9'}`}
        >
          {root ? (
            <span className={`h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 transition ${active ? 'ring-2 ring-emerald-500/60' : 'ring-stone-200 group-hover:ring-stone-300'}`}><ProductImage src={category.thumbnail || category.image} alt="" /></span>
          ) : (
            <span className={`ml-2.5 h-1.5 w-1.5 shrink-0 rounded-full transition ${active ? 'bg-emerald-600 ring-4 ring-emerald-600/15' : 'bg-stone-300 group-hover:bg-emerald-400'}`} />
          )}
          <span className={`truncate transition-colors ${active ? 'font-semibold text-emerald-900' : root ? 'font-medium text-stone-700 group-hover:text-stone-900' : 'text-stone-600 group-hover:text-stone-900'}`}>{category.name}</span>
          <CountBadge value={category.productCount ?? 0} active={active} />
        </ShallowLink>
        {kids.length > 0 && (
          <button
            type="button"
            onClick={() => toggle(category.id)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${category.name}`}
            className="mr-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-white hover:text-emerald-800 hover:shadow-sm"
          >
            <ChevronDown size={16} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {kids.length > 0 && (
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <ul className="mt-0.5 mb-1 ml-[1.6rem] space-y-0.5 border-l border-dashed border-stone-200 pl-1.5" inert={!open}>
              {kids.map((child) => (
                <TreeNode key={child.id} category={child} depth={depth + 1} index={index} activeSlug={activeSlug} expanded={expanded} toggle={toggle} params={params} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

/** Sidebar category list (card) with product counts; the active branch opens automatically. */
export function CategoryTree({ categories, activeSlug, params, onNavigate }) {
  const index = useCategoryIndex(categories);
  const [expanded, setExpanded] = useState(() => new Set());
  useEffect(() => {
    const active = index.bySlug.get(activeSlug);
    if (!active) return;
    setExpanded((current) => {
      const next = new Set(current);
      [...index.ancestors(active), active].forEach((category) => next.add(category.id));
      return next;
    });
  }, [activeSlug, index]);
  const toggle = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allActive = !activeSlug;
  const expandable = index.roots.filter((root) => index.childrenOf(root.id).length);

  return (
    <nav aria-label="Categories" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
      <div className="flex items-center gap-3 border-b border-stone-100 bg-gradient-to-r from-emerald-50/80 to-white px-4 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/20"><FolderTree size={16} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="text-sm font-bold text-emerald-950">Categories</h3>
          <p className="truncate text-[11px] text-stone-500">{index.roots.length} collections</p>
        </div>
        {expandable.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((current) => (current.size ? new Set() : new Set(expandable.map((root) => root.id))))}
            className="shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
          >
            {expanded.size ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>
      <ul className="space-y-0.5 p-2">
        <li>
          <div className={`group relative rounded-xl transition-colors duration-200 ${allActive ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}>
            <ActiveBar active={allActive} />
            <ShallowLink to={categoryTarget('', params)} onClick={onNavigate} aria-current={allActive ? 'page' : undefined} className="flex min-h-11 items-center gap-3 rounded-xl py-1.5 pr-2.5 pl-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${allActive ? 'bg-emerald-700 text-white shadow-sm' : 'bg-stone-100 text-stone-500 group-hover:text-emerald-800'}`}><LayoutGrid size={15} /></span>
              <span className={allActive ? 'font-semibold text-emerald-900' : 'font-medium text-stone-700 group-hover:text-stone-900'}>All products</span>
              <CountBadge value={index.total} active={allActive} />
            </ShallowLink>
          </div>
        </li>
        {index.roots.map((root) => (
          <TreeNode key={root.id} category={root} depth={0} index={index} activeSlug={activeSlug} expanded={expanded} toggle={toggle} params={params} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  );
}

/** One chip in the hero's category strip. */
function Chip({ to, active, image, icon: Icon, label, count, chipRef }) {
  return (
    <ShallowLink
      ref={chipRef}
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[13px] font-semibold whitespace-nowrap ring-1 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 ${active ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20 ring-emerald-800' : 'bg-white text-stone-700 ring-stone-200 hover:text-emerald-900 hover:ring-emerald-300'}`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full ${active ? 'bg-white/15' : 'bg-emerald-50 text-emerald-800'}`}>
        {Icon ? <Icon size={15} /> : <ProductImage src={image} alt="" />}
      </span>
      {label}
      {count != null && <span className={`text-[11px] font-medium tabular-nums ${active ? 'text-emerald-100' : 'text-stone-400'}`}>{count}</span>}
    </ShallowLink>
  );
}

/**
 * Listing header for /products and /category/[slug]. It keeps the same height for every
 * category (one-line title and description, fixed-size image) so switching category never
 * makes the page jump, and its chip strip lets phones switch category without the sidebar.
 */
export function CatalogHero({ slug, categories, fallback, params, title, total }) {
  const index = useCategoryIndex(categories);
  const category = slug ? (index.bySlug.get(slug) ?? fallback ?? null) : null;
  const trail = category ? index.ancestors(category) : [];
  const children = category ? index.childrenOf(category.id) : [];

  // Chip strip: this category's children, its siblings (sub-category), or the top-level list.
  const level = category && children.length ? category : category && trail.length ? trail.at(-1) : null;
  const items = level ? index.childrenOf(level.id) : index.roots;
  const up = level ? (index.byId.get(level.parent) ?? null) : null;
  const levelActive = level ? level.slug === slug : !slug;

  const stripRef = useRef(null);
  const activeChip = useRef(null);
  useEffect(() => {
    // Keep the active chip in view by scrolling the strip sideways only (never the page).
    const strip = stripRef.current;
    const chip = activeChip.current;
    if (!strip || !chip) return;
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [slug, items.length]);

  const heading = category?.name ?? title;
  const count = total ?? category?.productCount ?? index.total;
  const description = category?.shortDescription
    || (category ? `Explore natural ${category.name.toLowerCase()}, quality checked and delivered across Bangladesh.` : 'Natural wellness products, carefully selected. Filter by category, price and availability.');

  return (
    <section className="relative overflow-hidden border-b border-emerald-900/5 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40">
      <div aria-hidden="true" className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <Container className="relative pt-5 pb-4 sm:pt-7 sm:pb-5">
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <ol className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <li><Link to="/" className="hover:text-emerald-800">Home</Link></li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true">/</span><ShallowLink to={categoryTarget('', params)} className="hover:text-emerald-800">Products</ShallowLink></li>
            {trail.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center gap-1.5"><span aria-hidden="true">/</span><ShallowLink to={categoryTarget(item.slug, params)} className="truncate hover:text-emerald-800">{item.name}</ShallowLink></li>
            ))}
            {category && <li className="flex min-w-0 items-center gap-1.5"><span aria-hidden="true">/</span><span className="truncate text-stone-700">{category.name}</span></li>}
          </ol>
        </nav>

        <div className="mt-4 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-md shadow-emerald-900/10 ring-1 ring-emerald-900/10 sm:h-16 sm:w-16">
            {category ? <ProductImage src={category.thumbnail || category.image} alt="" /> : <LayoutGrid size={24} className="text-emerald-700" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold tracking-widest text-emerald-700 uppercase">{trail.length ? trail.map((item) => item.name).join(' › ') : category ? 'Category' : 'Shop'}</p>
            <h1 className="truncate font-serif text-2xl leading-tight font-semibold tracking-tight text-emerald-950 sm:text-3xl">{heading}</h1>
            <p className="mt-0.5 truncate text-sm text-stone-600">{description}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-sm md:flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200"><Package size={15} className="text-emerald-700" /> <span className="tabular-nums">{count}</span> product{count === 1 ? '' : 's'}</span>
            <span className="hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200 lg:inline-flex"><Truck size={15} className="text-emerald-700" /> Cash on delivery</span>
          </div>
        </div>

        {/* Category strip: swipe on phones, edges fade out */}
        <div
          ref={stripRef}
          aria-label="Browse categories"
          className="-mx-4 mt-5 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {level && (
            <ShallowLink to={categoryTarget(up?.slug ?? '', params)} aria-label={`Back to ${up?.name ?? 'all products'}`} className="grid h-10 w-10 shrink-0 snap-start place-items-center rounded-full bg-white text-stone-600 ring-1 ring-stone-200 transition hover:text-emerald-900 hover:ring-emerald-300 active:scale-95">
              <ChevronLeft size={18} />
            </ShallowLink>
          )}
          <Chip
            to={categoryTarget(level?.slug ?? '', params)}
            active={levelActive}
            icon={LayoutGrid}
            label={level ? `All ${level.name}` : 'All products'}
            count={level ? level.productCount : index.total}
            chipRef={levelActive ? activeChip : undefined}
          />
          {items.map((item) => (
            <Chip key={item.id} to={categoryTarget(item.slug, params)} active={item.slug === slug} image={item.thumbnail || item.image} label={item.name} count={item.productCount} chipRef={item.slug === slug ? activeChip : undefined} />
          ))}
        </div>
      </Container>
    </section>
  );
}
