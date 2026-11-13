'use client';

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from '@/router';
import { ChevronLeft, ChevronRight, LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useStore } from '../context/StoreContext.jsx';
import { money } from '../../lib/format.js';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx';
import { Container, EmptyBlock, ErrorBlock, PageHeader, Skel, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';

const SORTS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name: A–Z' },
];
const FILTER_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'availability', 'onSale', 'featured', 'newArrival', 'bestSelling'];

function Filters({ params, set, categories, activeCategory, priceRange, onClose }) {
  const [min, setMin] = useState(params.get('minPrice') ?? '');
  const [max, setMax] = useState(params.get('maxPrice') ?? '');
  useEffect(() => { setMin(params.get('minPrice') ?? ''); setMax(params.get('maxPrice') ?? ''); }, [params]);
  const check = (key, value) => params.get(key) === value;
  const step = priceRange.max > 0 ? Math.ceil(priceRange.max / 4 / 100) * 100 : 0;
  const presets = step ? [[0, step], [step, step * 2], [step * 2, step * 3], [step * 3, null]] : [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-bold tracking-wider text-emerald-950 uppercase">Category</h3>
        <ul className="mt-3 space-y-1">
          <li>
            <Link to={{ pathname: '/products', search: params.toString().replace(/(^|&)category=[^&]*/, '') }} onClick={onClose} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${!activeCategory ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-stone-700 hover:bg-stone-50'}`}>All products</Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link to={`/category/${category.slug}`} onClick={onClose} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${activeCategory === category.slug ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-stone-700 hover:bg-stone-50'} ${category.parent ? 'pl-7' : ''}`}>
                {category.name}<span className="text-xs text-stone-400">{category.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold tracking-wider text-emerald-950 uppercase">Price</h3>
        <form className="mt-3 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); set({ minPrice: min, maxPrice: max }); onClose?.(); }}>
          <input type="number" min="0" inputMode="numeric" value={min} onChange={(event) => setMin(event.target.value)} placeholder="Min" aria-label="Minimum price" className="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-emerald-700" />
          <span className="text-stone-400">–</span>
          <input type="number" min="0" inputMode="numeric" value={max} onChange={(event) => setMax(event.target.value)} placeholder="Max" aria-label="Maximum price" className="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-emerald-700" />
          <button type="submit" className="h-10 shrink-0 cursor-pointer rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900">Go</button>
        </form>
        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map(([from, to]) => {
              const active = params.get('minPrice') === String(from) && (params.get('maxPrice') ?? '') === (to === null ? '' : String(to));
              return (
                <button key={from} type="button" onClick={() => set({ minPrice: String(from), maxPrice: to === null ? '' : String(to) })} className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${active ? 'bg-emerald-800 text-white ring-emerald-800' : 'text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>
                  {to === null ? `${money(from)}+` : `${money(from)} – ${money(to)}`}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold tracking-wider text-emerald-950 uppercase">Availability & offers</h3>
        <div className="mt-3 space-y-2.5 text-sm text-stone-700">
          {[
            ['availability', 'in_stock', 'In stock only'],
            ['onSale', 'true', 'On sale'],
            ['featured', 'true', 'Featured'],
            ['newArrival', 'true', 'New arrivals'],
            ['bestSelling', 'true', 'Best sellers'],
          ].map(([key, value, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={check(key, value)} onChange={(event) => set({ [key]: event.target.checked ? value : '' })} className="h-4 w-4 cursor-pointer rounded accent-emerald-700" />
              {label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="grid h-11 w-11 cursor-pointer place-items-center rounded-full ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-stone-400">…</span>}
          <button type="button" onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={`h-11 min-w-11 cursor-pointer rounded-full px-3 text-sm font-semibold ${p === page ? 'bg-emerald-800 text-white' : 'text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}>{p}</button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page" className="grid h-11 w-11 cursor-pointer place-items-center rounded-full ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
    </nav>
  );
}

export default function ProductsPage() {
  const { slug } = useParams();
  const { categories } = useStore();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const query = Object.fromEntries([...params.entries()].filter(([key]) => key !== 'view'));
  if (slug) query.category = slug;
  if (query.q) { query.search = query.q; delete query.q; }
  query.limit = '12';

  const { data, loading, error, reload } = useApi(() => storeApi.get('/store/products', query), [JSON.stringify(query)]);
  const category = data?.category;
  const title = category ? category.name : params.get('q') ? `Search: “${params.get('q')}”` : params.get('onSale') ? 'Special offers' : 'All products';
  usePageMeta(title, category?.shortDescription || 'Browse our natural products — filter by category, price and availability.');

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };
  const activeFilters = FILTER_KEYS.filter((key) => params.get(key));
  const clearAll = () => setParams(new URLSearchParams(view === 'list' ? { view } : {}));
  const total = data?.pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        title={title}
        description={category?.shortDescription}
        crumbs={category ? [{ label: 'Categories', to: '/categories' }, { label: category.name }] : [{ label: 'Products' }]}
      />
      <Container className="py-10">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-32"><Filters params={params} set={set} categories={categories} activeCategory={slug} priceRange={data?.priceRange ?? { min: 0, max: 0 }} /></div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setFiltersOpen(true)} className={`${btn.secondary} h-11 text-sm lg:hidden`}><SlidersHorizontal size={16} /> Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}</button>
              <p className="text-sm text-stone-600" aria-live="polite">{loading && !data ? <Skel className="h-4 w-32" /> : `${total} product${total === 1 ? '' : 's'}`}</p>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="hidden sm:inline">Sort by</span>
                  <select value={params.get('sort') ?? 'latest'} onChange={(event) => set({ sort: event.target.value === 'latest' ? '' : event.target.value })} className="h-11 cursor-pointer rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-800 outline-none focus:border-emerald-700">
                    {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
                  </select>
                </label>
                <div className="hidden rounded-full p-1 ring-1 ring-stone-200 sm:flex" role="radiogroup" aria-label="View">
                  <button type="button" role="radio" aria-checked={view === 'grid'} aria-label="Grid view" onClick={() => set({ view: '' })} className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full ${view === 'grid' ? 'bg-emerald-800 text-white' : 'text-stone-500 hover:text-stone-900'}`}><LayoutGrid size={16} /></button>
                  <button type="button" role="radio" aria-checked={view === 'list'} aria-label="List view" onClick={() => set({ view: 'list' })} className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full ${view === 'list' ? 'bg-emerald-800 text-white' : 'text-stone-500 hover:text-stone-900'}`}><List size={16} /></button>
                </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {activeFilters.map((key) => (
                  <button key={key} type="button" onClick={() => set({ [key]: '' })} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-100">
                    {{ q: `“${params.get('q')}”`, minPrice: `From ${money(params.get('minPrice'))}`, maxPrice: `Up to ${money(params.get('maxPrice'))}`, availability: 'In stock', onSale: 'On sale', featured: 'Featured', newArrival: 'New', bestSelling: 'Best sellers', category: params.get('category') }[key]}
                    <X size={13} />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="cursor-pointer text-xs font-semibold text-stone-600 underline-offset-2 hover:underline">Clear all</button>
              </div>
            )}

            {error ? <ErrorBlock error={error} onRetry={reload} /> : loading && !data ? (
              <div className={view === 'list' ? 'space-y-4' : 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3'}>
                {Array.from({ length: 6 }, (_, index) => (view === 'list' ? <Skel key={index} className="h-44 rounded-3xl" /> : <ProductCardSkeleton key={index} />))}
              </div>
            ) : !data.items.length ? (
              <EmptyBlock icon={PackageSearch} title="No products found" message="Try removing a filter or searching for something else." action={activeFilters.length ? <button type="button" onClick={clearAll} className={`${btn.primary} h-11`}>Clear filters</button> : <Link to="/products" className={`${btn.primary} h-11`}>Browse all products</Link>} />
            ) : (
              <div className={`transition-opacity ${loading ? 'opacity-50' : ''} ${view === 'list' ? 'space-y-4' : 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3'}`}>
                {data.items.map((product) => <ProductCard key={product.id} product={product} layout={view} />)}
              </div>
            )}
            <Pagination pagination={data?.pagination} onPage={(page) => { set({ page: page > 1 ? String(page) : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        </div>
      </Container>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-emerald-950/40" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 p-4">
              <h2 className="font-serif text-xl font-semibold text-emerald-950">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="grid h-10 w-10 cursor-pointer place-items-center rounded-full hover:bg-stone-100"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5"><Filters params={params} set={set} categories={categories} activeCategory={slug} priceRange={data?.priceRange ?? { min: 0, max: 0 }} onClose={() => setFiltersOpen(false)} /></div>
            <div className="border-t border-stone-100 p-4"><button type="button" onClick={() => setFiltersOpen(false)} className={`${btn.primary} h-12 w-full`}>Show {total} products</button></div>
          </div>
        </div>
      )}
    </>
  );
}
