import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api, toFormData } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormInput, FormSection, SelectInput, TagInput, TextArea, Toggle, fieldErrors } from '../../components/ui/Form.jsx';
import { ImageUploader, MultiImageUploader } from '../../components/ui/ImageUploader.jsx';
import { FormSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { slugify } from '../../lib/slugify.js';
import { money } from '../../lib/format.js';

const EMPTY = {
  name: '', slug: '', sku: '', code: '', brand: '', productType: 'simple', category: '', subcategory: '',
  shortDescription: '', description: '',
  regularPrice: '', salePrice: '', costPrice: '', tax: '', currency: 'BDT',
  stockQuantity: 0, lowStockThreshold: 5, stockStatus: 'in_stock', manageStock: true, allowBackorders: false,
  weight: '', dimensions: { length: '', width: '', height: '' }, colors: [], sizes: [], material: '', warranty: '', tags: [],
  isFeatured: false, isBestSelling: false, isNewArrival: false, status: 'active',
  seo: { title: '', description: '', keywords: [] },
};

const TYPES = [{ value: 'simple', label: 'Simple product' }, { value: 'variable', label: 'Variable product' }, { value: 'digital', label: 'Digital product' }, { value: 'service', label: 'Service' }];

export default function ProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useAuth();
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    category: searchParams.get('category') ?? '',
    subcategory: searchParams.get('subcategory') ?? '',
    currency: settings?.store?.currency ?? 'BDT',
    lowStockThreshold: settings?.store?.defaultLowStockThreshold ?? 5,
  }));
  const [slugTouched, setSlugTouched] = useState(false);
  const [images, setImages] = useState({ image: { file: null, removed: false }, thumbnail: { file: null, removed: false } });
  const [gallery, setGallery] = useState({ existing: [], files: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(() => api.get(`/products/${id}`), [id], { enabled: editing });
  const categories = useApi(() => api.get('/categories', { all: 'true' }), []);

  useEffect(() => {
    const product = existing.data;
    if (!product) return;
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, product[key] ?? EMPTY[key]])),
      category: product.category?.id ?? '',
      subcategory: product.subcategory?.id ?? '',
      salePrice: product.salePrice || '',
      costPrice: product.costPrice || '',
      tax: product.tax || '',
      weight: product.weight || '',
      dimensions: { length: product.dimensions?.length || '', width: product.dimensions?.width || '', height: product.dimensions?.height || '' },
      seo: { ...EMPTY.seo, ...product.seo },
    });
    setGallery({ existing: product.gallery ?? [], files: [] });
    setSlugTouched(true);
  }, [existing.data]);

  const all = categories.data?.items ?? [];
  const parentOf = (item) => item.parent?.id ?? item.parent ?? null;
  const subcategories = useMemo(() => all.filter((item) => parentOf(item) === form.category), [all, form.category]);

  const set = (field) => (event) => {
    const value = event?.target ? (event.target.type === 'checkbox' ? event.target.checked : event.target.value) : event;
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !slugTouched ? { slug: slugify(value) } : {}),
      ...(field === 'category' ? { subcategory: '' } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const setNested = (group, field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, [group]: { ...current[group], [field]: value } }));
  };

  const regular = Number(form.regularPrice) || 0;
  const sale = Number(form.salePrice) || 0;
  const discount = regular > 0 && sale > 0 && sale < regular ? Math.round((1 - sale / regular) * 10000) / 100 : 0;
  const margin = Number(form.costPrice) > 0 && (sale || regular) ? Math.round((((sale || regular) - Number(form.costPrice)) / (sale || regular)) * 1000) / 10 : null;

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!form.category) next.category = 'Choose a category';
    if (form.regularPrice === '' || regular < 0) next.regularPrice = 'Enter the regular price';
    if (sale > 0 && sale >= regular) next.salePrice = 'Sale price must be lower than the regular price';
    if (form.manageStock && !Number.isInteger(Number(form.stockQuantity))) next.stockQuantity = 'Use a whole number';
    if (Number(form.tax) > 100) next.tax = 'Tax is a percentage (0–100)';
    setErrors(next);
    if (Object.keys(next).length) toast.error('Please fix the highlighted fields');
    return !Object.keys(next).length;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        subcategory: form.subcategory || null,
        gallery: gallery.existing,
        removeImage: images.image.removed,
        removeThumbnail: images.thumbnail.removed,
      };
      const body = toFormData(payload, { image: images.image.file, thumbnail: images.thumbnail.file, gallery: gallery.files });
      const saved = editing ? await api.put(`/products/${id}`, body) : await api.post('/products', body);
      toast.success(editing ? 'Product updated' : 'Product created');
      navigate(`/products/${saved.id}`);
    } catch (requestError) {
      setErrors(fieldErrors(requestError));
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = [{ label: 'Products', to: '/products' }, { label: editing ? 'Edit product' : 'Add Product' }];
  if (editing && existing.loading) return (<><PageHeader breadcrumb={breadcrumb} title="Edit product" /><FormSkeleton sections={4} /></>);
  if (editing && existing.error) return (<><PageHeader breadcrumb={breadcrumb} title="Edit product" /><ErrorState error={existing.error} onRetry={existing.reload} /></>);

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        breadcrumb={breadcrumb}
        title={editing ? `Edit “${existing.data?.name}”` : 'Add Product'}
        description="Fields marked * are required. Everything else can be filled in later."
        actions={(
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" icon={Save} busy={saving} busyLabel="Saving…">{editing ? 'Save changes' : 'Create product'}</Button>
          </>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <FormSection title="Basic information">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput label="Product name" required value={form.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" placeholder="e.g. Cold-pressed Neem Oil 100ml" />
              <FormInput label="Slug" prefix="/" value={form.slug} onChange={(event) => { setSlugTouched(true); set('slug')(slugify(event.target.value)); }} hint="Auto-generated from the name." error={errors.slug} />
              <FormInput label="SKU" value={form.sku} onChange={(event) => set('sku')(event.target.value.toUpperCase())} hint="Leave empty to auto-generate." error={errors.sku} />
              <FormInput label="Product code" value={form.code} onChange={set('code')} error={errors.code} />
              <FormInput label="Brand" value={form.brand} onChange={set('brand')} />
              <SelectInput label="Product type" value={form.productType} onChange={set('productType')} options={TYPES} />
              <TextArea label="Short description" rows={2} value={form.shortDescription} onChange={set('shortDescription')} hint={`${form.shortDescription.length}/500`} className="sm:col-span-2" />
              <TextArea label="Full description" rows={7} value={form.description} onChange={set('description')} className="sm:col-span-2" />
            </div>
          </FormSection>

          <FormSection title="Pricing" description="The discount percentage is calculated automatically.">
            <div className="grid gap-5 sm:grid-cols-3">
              <FormInput label="Regular price" required type="number" min="0" step="0.01" value={form.regularPrice} onChange={set('regularPrice')} error={errors.regularPrice} suffix={form.currency} />
              <FormInput label="Sale price" type="number" min="0" step="0.01" value={form.salePrice} onChange={set('salePrice')} error={errors.salePrice} suffix={form.currency} />
              <FormInput label="Cost price" type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} suffix={form.currency} hint="Used for profit reports." />
              <div className="rounded-xl bg-emerald-50/70 px-4 py-3 ring-1 ring-emerald-100">
                <p className="text-xs font-semibold text-emerald-700">Discount</p>
                <p className="font-display text-xl font-bold text-emerald-800">{discount}%</p>
                {discount > 0 && <p className="text-[11px] text-emerald-700">Saves {money(regular - sale)}</p>}
              </div>
              <FormInput label="Tax" type="number" min="0" max="100" step="0.01" value={form.tax} onChange={set('tax')} error={errors.tax} suffix="%" hint="Leave empty to use the store tax rate." />
              <FormInput label="Currency" maxLength={3} value={form.currency} onChange={(event) => set('currency')(event.target.value.toUpperCase())} hint={margin != null ? `Margin ${margin}%` : undefined} />
            </div>
          </FormSection>

          <FormSection title="Inventory">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-4 sm:col-span-2 sm:flex sm:gap-8 sm:space-y-0">
                <Toggle checked={form.manageStock} onChange={set('manageStock')} label="Manage stock" description="Track quantity and update it with every order." />
                <Toggle checked={form.allowBackorders} onChange={set('allowBackorders')} label="Allow backorders" description="Keep selling when stock reaches zero." />
              </div>
              {form.manageStock ? (
                <>
                  <FormInput label="Stock quantity" type="number" step="1" value={form.stockQuantity} onChange={set('stockQuantity')} error={errors.stockQuantity} />
                  <FormInput label="Minimum stock alert" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} hint="You’ll be notified at or below this quantity." />
                </>
              ) : (
                <SelectInput label="Stock status" value={form.stockStatus} onChange={set('stockStatus')} options={[{ value: 'in_stock', label: 'In stock' }, { value: 'out_of_stock', label: 'Out of stock' }, { value: 'backorder', label: 'On backorder' }]} />
              )}
            </div>
          </FormSection>

          <FormSection title="Images" description="JPG, PNG or WEBP up to 5 MB each. Existing images are kept unless you replace or remove them.">
            <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
              <ImageUploader label="Main product image" existing={existing.data?.image} {...images.image} onChange={(value) => setImages((current) => ({ ...current, image: value }))} aspect="aspect-square" />
              <ImageUploader label="Thumbnail" existing={existing.data?.thumbnail} {...images.thumbnail} onChange={(value) => setImages((current) => ({ ...current, thumbnail: value }))} aspect="aspect-square" hint="Used in lists. Falls back to the main image." />
            </div>
            <div className="mt-6"><MultiImageUploader label="Gallery images" existing={gallery.existing} files={gallery.files} onChange={setGallery} /></div>
          </FormSection>

          <FormSection title="Additional information">
            <div className="grid gap-5 sm:grid-cols-4">
              <FormInput label="Weight" type="number" min="0" step="0.01" value={form.weight} onChange={set('weight')} suffix="kg" />
              <FormInput label="Length" type="number" min="0" step="0.1" value={form.dimensions.length} onChange={setNested('dimensions', 'length')} suffix="cm" />
              <FormInput label="Width" type="number" min="0" step="0.1" value={form.dimensions.width} onChange={setNested('dimensions', 'width')} suffix="cm" />
              <FormInput label="Height" type="number" min="0" step="0.1" value={form.dimensions.height} onChange={setNested('dimensions', 'height')} suffix="cm" />
              <TagInput label="Colours" value={form.colors} onChange={set('colors')} className="sm:col-span-2" />
              <TagInput label="Sizes" value={form.sizes} onChange={set('sizes')} className="sm:col-span-2" />
              <FormInput label="Material" value={form.material} onChange={set('material')} className="sm:col-span-2" />
              <FormInput label="Warranty" value={form.warranty} onChange={set('warranty')} className="sm:col-span-2" placeholder="e.g. 6 months" />
              <TagInput label="Product tags" value={form.tags} onChange={set('tags')} className="sm:col-span-4" />
            </div>
          </FormSection>

          <FormSection title="Search engine optimisation">
            <div className="grid gap-5">
              <FormInput label="SEO title" value={form.seo.title} onChange={setNested('seo', 'title')} hint={`${form.seo.title.length}/160`} placeholder={form.name} />
              <TextArea label="SEO description" rows={3} value={form.seo.description} onChange={setNested('seo', 'description')} hint={`${form.seo.description.length}/320`} />
              <TagInput label="SEO keywords" value={form.seo.keywords} onChange={setNested('seo', 'keywords')} />
            </div>
          </FormSection>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <FormSection title="Status">
            <SelectInput label="Product status" value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active — visible in store' }, { value: 'inactive', label: 'Inactive — hidden' }, { value: 'draft', label: 'Draft' }]} />
          </FormSection>
          <FormSection title="Organisation">
            <div className="space-y-5">
              <SelectInput label="Category" required value={form.category} onChange={set('category')} error={errors.category} placeholder="Choose a category" options={all.map((item) => ({ value: item.id, label: parentOf(item) ? `— ${item.name}` : item.name }))} />
              <SelectInput label="Subcategory" value={form.subcategory} onChange={set('subcategory')} error={errors.subcategory} placeholder={subcategories.length ? 'None' : 'No subcategories'} options={subcategories.map((item) => ({ value: item.id, label: item.name }))} disabled={!subcategories.length} />
            </div>
          </FormSection>
          <FormSection title="Highlights">
            <div className="space-y-4">
              <Toggle checked={form.isFeatured} onChange={set('isFeatured')} label="Featured product" />
              <Toggle checked={form.isNewArrival} onChange={set('isNewArrival')} label="New arrival" />
              <Toggle checked={form.isBestSelling} onChange={set('isBestSelling')} label="Best selling" />
            </div>
          </FormSection>
        </div>
      </div>
    </form>
  );
}
