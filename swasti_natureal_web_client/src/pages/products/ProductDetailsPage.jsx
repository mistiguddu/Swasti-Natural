import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, ImageIcon, Pencil, Star, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, CardHeader, DetailItem, PageHeader } from '../../components/ui/Card.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { ProductDetailsSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { dateTime, money, number, titleCase } from '../../lib/format.js';
import { StockCell } from './ProductListPage.jsx';
import { t } from '../../i18n/index.js';

function Chips({ items }) {
  if (!items?.length) return null;
  return <span className="flex flex-wrap gap-1.5">{items.map((item) => <span key={item} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item}</span>)}</span>;
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: product, loading, error, reload } = useApi(() => api.get(`/products/${id}`), [id]);
  const [active, setActive] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const breadcrumb = [{ label: 'Products', to: '/products' }, { label: product?.name ?? 'Details' }];

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      navigate('/products');
    } catch (requestError) {
      toast.error(requestError.message);
      setBusy(false);
    }
  }

  async function duplicate() {
    try {
      const copy = await api.post(`/products/${id}/duplicate`);
      toast.success('Duplicated as draft');
      navigate(`/products/${copy.id}/edit`);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  if (loading) return (<><PageHeader breadcrumb={breadcrumb} title="Product details" /><ProductDetailsSkeleton /></>);
  if (error) return (<><PageHeader breadcrumb={breadcrumb} title="Product details" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);

  const media = [product.image, product.thumbnail, ...product.gallery].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index);
  const shown = active ?? media[0];
  const dims = product.dimensions ?? {};

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={product.name}
        description={<span className="inline-flex flex-wrap items-center gap-2">SKU {product.sku} <StatusBadge status={product.status} /> <StatusBadge status={product.stockStatus} /></span>}
        actions={(
          <>
            <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirm(true)}>{t('Delete')}</Button>
            <Button variant="secondary" icon={Copy} onClick={duplicate}>{t('Duplicate')}</Button>
            <LinkButton to={`/products/${id}/edit`} icon={Pencil}>{t('Edit product')}</LinkButton>
          </>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="self-start p-5">
          {shown ? <img src={shown} alt={product.name} className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200" /> : <div className="grid aspect-square place-items-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"><ImageIcon size={40} /></div>}
          {media.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {media.map((url) => (
                <button key={url} type="button" onClick={() => setActive(url)} aria-label="Show image" className={`cursor-pointer overflow-hidden rounded-lg ring-2 transition ${url === shown ? 'ring-teal-500' : 'ring-transparent hover:ring-slate-300'}`}>
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{t('Price')}</p>
                <p className="font-display text-3xl font-bold text-slate-900">{money(product.salePrice > 0 ? product.salePrice : product.regularPrice)}</p>
                {product.salePrice > 0 && <p className="text-sm text-slate-500"><span className="line-through">{money(product.regularPrice)}</span> <span className="font-semibold text-emerald-600">−{product.discountPercentage}%</span></p>}
              </div>
              <div><p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{t('Stock')}</p><StockCell product={product} /></div>
              <div><p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{t('Sold')}</p><p className="font-semibold text-slate-800">{number(product.soldCount)} units</p></div>
              <div><p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{t('Rating')}</p><p className="inline-flex items-center gap-1 font-semibold text-slate-800"><Star size={14} className="fill-amber-400 text-amber-400" /> {product.ratingAverage || '—'} <span className="text-xs font-normal text-slate-400">({product.ratingCount})</span></p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.isFeatured && <StatusBadge tone="amber" status="featured" label="Featured" />}
              {product.isNewArrival && <StatusBadge tone="sky" status="new" label="New arrival" />}
              {product.isBestSelling && <StatusBadge tone="violet" status="best" label="Best selling" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Product information" />
            <dl className="grid gap-5 p-5 sm:grid-cols-3">
              <DetailItem label="Category">{product.category ? <Link to={`/categories/${product.category.id}/products`} className="text-teal-700 hover:underline">{product.category.name}</Link> : null}</DetailItem>
              <DetailItem label="Subcategory">{product.subcategory?.name}</DetailItem>
              <DetailItem label="Brand">{product.brand || null}</DetailItem>
              <DetailItem label="Type">{titleCase(product.productType)}</DetailItem>
              <DetailItem label="Product code">{product.code || null}</DetailItem>
              <DetailItem label="Slug">/{product.slug}</DetailItem>
              <DetailItem label="Cost price">{product.costPrice ? money(product.costPrice) : null}</DetailItem>
              <DetailItem label="Tax">{product.tax ? `${product.tax}%` : 'Store default'}</DetailItem>
              <DetailItem label="Currency">{product.currency}</DetailItem>
              <DetailItem label="Manage stock">{product.manageStock ? `Yes · alert at ${product.lowStockThreshold}` : 'No'}</DetailItem>
              <DetailItem label="Backorders">{product.allowBackorders ? 'Allowed' : 'Not allowed'}</DetailItem>
              <DetailItem label="Weight">{product.weight ? `${product.weight} kg` : null}</DetailItem>
              <DetailItem label="Dimensions">{dims.length || dims.width || dims.height ? `${dims.length || 0} × ${dims.width || 0} × ${dims.height || 0} cm` : null}</DetailItem>
              <DetailItem label="Material">{product.material || null}</DetailItem>
              <DetailItem label="Warranty">{product.warranty || null}</DetailItem>
              <DetailItem label="Colours"><Chips items={product.colors} /></DetailItem>
              <DetailItem label="Sizes"><Chips items={product.sizes} /></DetailItem>
              <DetailItem label="Tags"><Chips items={product.tags} /></DetailItem>
              <DetailItem label="Created">{dateTime(product.createdAt)}</DetailItem>
              <DetailItem label="Updated">{dateTime(product.updatedAt)}</DetailItem>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-700">
              {product.shortDescription && <p className="font-medium text-slate-800">{product.shortDescription}</p>}
              {product.description ? <p className="whitespace-pre-line">{product.description}</p> : !product.shortDescription && <p className="text-slate-400">{t('No description yet.')}</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="SEO information" />
            <dl className="grid gap-5 p-5">
              <DetailItem label="SEO title">{product.seo?.title || null}</DetailItem>
              <DetailItem label="SEO description">{product.seo?.description || null}</DetailItem>
              <DetailItem label="Keywords"><Chips items={product.seo?.keywords} /></DetailItem>
            </dl>
          </Card>
        </div>
      </div>
      <ConfirmationModal open={confirm} busy={busy} onClose={() => setConfirm(false)} onConfirm={remove} title={`Delete “${product.name}”?`} message="Its reviews are removed too. Past orders keep their item details. This can’t be undone." />
    </>
  );
}
