'use client';

import { Link } from '@/router';
import { ArrowRight, FolderTree } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { Container, EmptyBlock, PageHeader, ProductImage, Skel, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';

export default function CategoriesPage() {
  const { categories, info } = useStore();
  usePageMeta('Categories', 'Shop by category — browse our full range of natural products.');
  const top = categories.filter((category) => !category.parent);
  const childrenOf = (id) => categories.filter((category) => category.parent === id);
  const loading = !info;

  return (
    <>
      <PageHeader title="Shop by category" description="Browse our full range, organised to help you find the right product." crumbs={[{ label: 'Categories' }]} />
      <Container className="py-12">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skel key={i} className="aspect-[4/3] rounded-3xl" />)}</div>
        ) : !top.length ? (
          <EmptyBlock icon={FolderTree} title="No categories yet" message="Please check back soon." action={<Link to="/products" className={`${btn.primary} h-11`}>Browse products</Link>} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((category) => (
              <article key={category.id} className="group overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/80 transition hover:shadow-xl hover:shadow-emerald-900/5">
                <Link to={`/category/${category.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-emerald-900">
                  <ProductImage src={category.image || category.thumbnail} alt={category.name} imgClassName="transition duration-700 group-hover:scale-105" className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 to-transparent" />
                  <h2 className="absolute bottom-4 left-5 font-serif text-2xl font-semibold text-white">{category.name}</h2>
                </Link>
                <div className="p-5">
                  {category.shortDescription && <p className="line-clamp-2 text-sm text-stone-600">{category.shortDescription}</p>}
                  {childrenOf(category.id).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {childrenOf(category.id).map((child) => <Link key={child.id} to={`/category/${child.slug}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">{child.name}</Link>)}
                    </div>
                  )}
                  <Link to={`/category/${category.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">{category.productCount} products <ArrowRight size={15} /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
