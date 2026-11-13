'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/router';
import { ChevronDown, FolderTree, LayoutGrid, Package, Truck } from 'lucide-react';
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
function categoryTarget(slug, params) {
  const keep = new URLSearchParams();
  for (const key of ['sort', 'view']) if (params?.get(key)) keep.set(key, params.get(key));
  return { pathname: slug ? `/category/${slug}` : '/products', search: keep.toString() };
}

function CountBadge({ value, active }) {
  return <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500 group-hover:bg-white'}`}>{value}</span>;
}

function TreeNode({ category, depth, index, activeSlug, expanded, toggle, params, onNavigate }) {
  const kids = index.childrenOf(category.id);
  const active = category.slug === activeSlug;
  const open = expanded.has(category.id);
  return (
    <li className={depth > 0 ? 'relative before:absolute before:top-[1.15rem] before:-left-3 before:h-px before:w-3 before:bg-stone-200' : ''}>
      <div className={`group flex items-center gap-1 rounded-xl transition ${active ? 'bg-emerald-50 ring-1 ring-emerald-200/70' : 'hover:bg-stone-50'}`}>
        <Link
          to={categoryTarget(category.slug, params)}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={`flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-1.5 text-sm ${kids.length ? '' : 'pr-2'}`}
        >
          {depth === 0 ? (
            <span className={`h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ${active ? 'ring-emerald-300' : 'ring-stone-200'}`}><ProductImage src={category.thumbnail || category.image} alt="" /></span>
          ) : (
            <span className={`ml-1 h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-emerald-600 ring-4 ring-emerald-600/15' : 'bg-stone-300 group-hover:bg-emerald-400'}`} />
          )}
          <span className={`truncate ${active ? 'font-semibold text-emerald-900' : 'text-stone-700 group-hover:text-stone-900'}`}>{category.name}</span>
          <CountBadge value={category.productCount ?? 0} active={active} />
        </Link>
        {kids.length > 0 && (
          <button
            type="button"
            onClick={() => toggle(category.id)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${category.name}`}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-white hover:text-emerald-800"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {kids.length > 0 && (
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <ul className="mt-0.5 ml-[1.15rem] space-y-0.5 border-l border-stone-200 py-1 pl-3" inert={!open}>
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

/** Collapsible category tree with product counts; the active branch opens automatically. */
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

  return (
    <nav aria-label="Categories">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-emerald-950 uppercase"><FolderTree size={15} className="text-emerald-700" /> Categories</h3>
        {index.roots.length > 0 && (
          <button type="button" onClick={() => setExpanded((current) => (current.size ? new Set() : new Set(index.roots.map((root) => root.id))))} className="cursor-pointer text-xs font-semibold text-emerald-800 hover:underline">
            {expanded.size ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-0.5">
        <li>
          <Link to={categoryTarget('', params)} onClick={onNavigate} aria-current={allActive ? 'page' : undefined} className={`group flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5 text-sm transition ${allActive ? 'bg-emerald-50 ring-1 ring-emerald-200/70' : 'hover:bg-stone-50'}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${allActive ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500'}`}><LayoutGrid size={15} /></span>
            <span className={allActive ? 'font-semibold text-emerald-900' : 'text-stone-700'}>All products</span>
            <CountBadge value={index.total} active={allActive} />
          </Link>
        </li>
        {index.roots.map((root) => (
          <TreeNode key={root.id} category={root} depth={0} index={index} activeSlug={activeSlug} expanded={expanded} toggle={toggle} params={params} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  );
}

/** Category page header: breadcrumb trail, image, stats and sub-category navigation. */
export function CategoryHero({ slug, categories, fallback, params }) {
  const index = useCategoryIndex(categories);
  const category = index.bySlug.get(slug) ?? fallback;
  if (!category) {
    return <div className="h-64 border-b border-emerald-900/5 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40" />;
  }
  const trail = index.ancestors(category);
  const children = index.childrenOf(category.id);
  // Sub-navigation: this category's children, or its siblings when it is a sub-category.
  const navParent = children.length ? category : trail.at(-1);
  const navItems = navParent ? index.childrenOf(navParent.id) : [];

  return (
    <section className="relative overflow-hidden border-b border-emerald-900/5 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50">
      <div aria-hidden="true" className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
      <Container className="relative py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-emerald-800">Home</Link></li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true">/</span><Link to="/categories" className="hover:text-emerald-800">Categories</Link></li>
            {trail.map((item) => (
              <li key={item.id} className="flex items-center gap-1.5"><span aria-hidden="true">/</span><Link to={categoryTarget(item.slug, params)} className="hover:text-emerald-800">{item.name}</Link></li>
            ))}
            <li className="flex items-center gap-1.5"><span aria-hidden="true">/</span><span className="text-stone-700">{category.name}</span></li>
          </ol>
        </nav>

        <div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="motion-safe:animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[11px] font-bold tracking-widest text-emerald-800 uppercase shadow-sm ring-1 ring-emerald-900/10">
              <FolderTree size={13} /> {trail.length ? trail.map((item) => item.name).join(' › ') : 'Category'}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight text-emerald-950 sm:text-5xl">{category.name}</h1>
            {category.shortDescription && <p className="mt-3 max-w-2xl text-base text-stone-600 sm:text-lg">{category.shortDescription}</p>}
            <div className="mt-6 flex flex-wrap gap-2.5 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200"><Package size={15} className="text-emerald-700" /> {category.productCount ?? 0} product{category.productCount === 1 ? '' : 's'}</span>
              {children.length > 0 && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200"><FolderTree size={15} className="text-emerald-700" /> {children.length} sub-categor{children.length === 1 ? 'y' : 'ies'}</span>}
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200"><Truck size={15} className="text-emerald-700" /> Cash on delivery</span>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div aria-hidden="true" className="absolute inset-4 rounded-[2rem] bg-emerald-300/30 blur-2xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/10">
              <ProductImage src={category.image || category.thumbnail} alt={category.name} />
            </div>
          </div>
        </div>

        {navItems.length > 0 && (
          <div className="mt-8 -mb-1 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label={`${navParent.name} sub-categories`}>
            <Link to={categoryTarget(navParent.slug, params)} aria-current={navParent.slug === category.slug ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold ring-1 transition ${navParent.slug === category.slug ? 'bg-emerald-800 text-white ring-emerald-800' : 'bg-white text-stone-700 ring-stone-200 hover:ring-emerald-300'}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-full ${navParent.slug === category.slug ? 'bg-white/15' : 'bg-emerald-50 text-emerald-800'}`}><LayoutGrid size={14} /></span>
              All {navParent.name}
            </Link>
            {navItems.map((item) => {
              const active = item.slug === category.slug;
              return (
                <Link key={item.id} to={categoryTarget(item.slug, params)} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold ring-1 transition ${active ? 'bg-emerald-800 text-white ring-emerald-800' : 'bg-white text-stone-700 ring-stone-200 hover:ring-emerald-300'}`}>
                  <span className="h-7 w-7 overflow-hidden rounded-full bg-stone-100"><ProductImage src={item.thumbnail || item.image} alt="" /></span>
                  {item.name}
                  <span className={`text-xs ${active ? 'text-emerald-100' : 'text-stone-400'}`}>{item.productCount}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
