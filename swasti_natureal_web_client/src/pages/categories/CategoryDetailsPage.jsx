import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ImageIcon, Package, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, CardHeader, DetailItem, PageHeader } from '../../components/ui/Card.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { CategoryDetailsSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { dateTime } from '../../lib/format.js';

export default function CategoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshCategories } = useOutletContext() ?? {};
  const { data: category, loading, error, reload } = useApi(() => api.get(`/categories/${id}`), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const breadcrumb = [{ label: 'Products' }, { label: 'Categories', to: '/categories' }, { label: category?.name ?? 'Details' }];

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      refreshCategories?.();
      navigate('/categories');
    } catch (requestError) {
      toast.error(requestError.message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (<><PageHeader breadcrumb={breadcrumb} title="Category details" /><CategoryDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="Category details" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={category.name}
        description={<span className="inline-flex flex-wrap items-center gap-2">/{category.slug} <StatusBadge status={category.status} />{category.isFeatured && <StatusBadge tone="amber" label="Featured" status="featured" />}</span>}
        actions={(
          <>
            <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirm(true)}>Delete</Button>
            <LinkButton variant="secondary" to={`/categories/${id}/products`} icon={Package}>View products</LinkButton>
            <LinkButton to={`/categories/${id}/edit`} icon={Pencil}>Edit category</LinkButton>
          </>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Category image</p>
            {category.image ? <img src={category.image} alt={category.name} className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200" /> : <div className="grid aspect-[4/3] place-items-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"><ImageIcon size={36} /></div>}
            <p className="mt-5 mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Thumbnail</p>
            <Thumb src={category.thumbnail} size="h-24 w-24" rounded="rounded-xl" icon={ImageIcon} />
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Total products</p>
                <p className="mt-1 font-display text-3xl font-bold text-slate-900">{category.productCount}</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100"><Package size={22} /></span>
            </div>
            <div className="mt-4 flex gap-2">
              <LinkButton size="sm" variant="soft" to={`/categories/${id}/products`}>Browse products</LinkButton>
              <LinkButton size="sm" variant="secondary" icon={Plus} to={`/products/new?category=${id}`}>Add product</LinkButton>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Category information" />
            <dl className="grid gap-5 p-5 sm:grid-cols-3">
              <DetailItem label="Name">{category.name}</DetailItem>
              <DetailItem label="Code"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{category.code}</code></DetailItem>
              <DetailItem label="Slug">/{category.slug}</DetailItem>
              <DetailItem label="Parent category">{category.parent ? <Link className="text-teal-700 hover:underline" to={`/categories/${category.parent.id}`}>{category.parent.name}</Link> : 'Top level'}</DetailItem>
              <DetailItem label="Status"><StatusBadge status={category.status} /></DetailItem>
              <DetailItem label="Featured">{category.isFeatured ? <span className="inline-flex items-center gap-1 text-amber-600"><Star size={14} className="fill-current" /> Yes</span> : 'No'}</DetailItem>
              <DetailItem label="Display order">{category.displayOrder}</DetailItem>
              <DetailItem label="Created">{dateTime(category.createdAt)}</DetailItem>
              <DetailItem label="Last updated">{dateTime(category.updatedAt)}</DetailItem>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Description" />
            <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-700">
              {category.shortDescription && <p className="font-medium text-slate-800">{category.shortDescription}</p>}
              {category.description ? <p className="whitespace-pre-line">{category.description}</p> : !category.shortDescription && <p className="text-slate-400">No description yet.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="SEO information" />
            <dl className="grid gap-5 p-5">
              <DetailItem label="SEO title">{category.seo?.title || null}</DetailItem>
              <DetailItem label="SEO description">{category.seo?.description || null}</DetailItem>
              <DetailItem label="Keywords">{category.seo?.keywords?.length ? <span className="flex flex-wrap gap-1.5">{category.seo.keywords.map((word) => <span key={word} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{word}</span>)}</span> : null}</DetailItem>
            </dl>
          </Card>
          {category.children?.length > 0 && (
            <Card>
              <CardHeader title="Subcategories" description={`${category.children.length} subcategories`} />
              <ul className="divide-y divide-slate-100">
                {category.children.map((child) => (
                  <li key={child.id} className="flex items-center gap-3 px-5 py-3">
                    <Thumb src={child.thumbnail || child.image} size="h-9 w-9" icon={ImageIcon} />
                    <Link to={`/categories/${child.id}`} className="font-medium text-slate-800 hover:text-teal-700">{child.name}</Link>
                    <span className="ml-auto"><StatusBadge status={child.status} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <ConfirmationModal open={confirm} busy={busy} onClose={() => setConfirm(false)} onConfirm={remove} title={`Delete “${category.name}”?`} message="A category that still has products or subcategories can’t be deleted. This can’t be undone." />
    </>
  );
}
