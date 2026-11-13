'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from '@/router';
import { Save } from 'lucide-react';
import { api, toFormData } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormInput, FormSection, SelectInput, TagInput, TextArea, Toggle, fieldErrors } from '../../components/ui/Form.jsx';
import { ImageUploader } from '../../components/ui/ImageUploader.jsx';
import { FormSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { slugify } from '../../lib/slugify.js';
import { t } from '../../i18n/index.js';

const EMPTY = {
  name: '', slug: '', code: '', shortDescription: '', description: '', parent: '',
  seo: { title: '', description: '', keywords: [] }, displayOrder: 0, isFeatured: false, status: 'active',
};

export default function CategoryFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshCategories } = useOutletContext() ?? {};
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [images, setImages] = useState({ image: { file: null, removed: false }, thumbnail: { file: null, removed: false } });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(() => api.get(`/categories/${id}`), [id], { enabled: editing });
  const parents = useApi(() => api.get('/categories', { all: 'true' }), []);

  useEffect(() => {
    if (!existing.data) return;
    const category = existing.data;
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, category[key] ?? EMPTY[key]])),
      parent: category.parent?.id ?? '',
      seo: { ...EMPTY.seo, ...category.seo },
    });
    setSlugTouched(true);
  }, [existing.data]);

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, [field]: value, ...(field === 'name' && !slugTouched ? { slug: slugify(value) } : {}) }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const setSeo = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, seo: { ...current.seo, [field]: value } }));
  };

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (form.code && !/^[A-Za-z0-9_-]+$/.test(form.code)) next.code = 'Use letters, numbers, - or _ only';
    if (form.shortDescription.length > 300) next.shortDescription = 'Keep it under 300 characters';
    if (form.seo.title.length > 160) next['seo.title'] = 'Keep it under 160 characters';
    if (form.seo.description.length > 320) next['seo.description'] = 'Keep it under 320 characters';
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, removeImage: images.image.removed, removeThumbnail: images.thumbnail.removed };
      const body = toFormData(payload, { image: images.image.file, thumbnail: images.thumbnail.file });
      const saved = editing ? await api.put(`/categories/${id}`, body) : await api.post('/categories', body);
      toast.success(editing ? 'Category updated' : 'Category created');
      refreshCategories?.();
      navigate(`/categories/${saved.id}`);
    } catch (requestError) {
      setErrors(fieldErrors(requestError));
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = [{ label: 'Products' }, { label: 'Categories', to: '/categories' }, { label: editing ? 'Edit' : 'Add Category' }];
  if (editing && existing.loading) return (<><PageHeader breadcrumb={breadcrumb} title="Edit category" /><FormSkeleton /></>);
  if (editing && existing.error) return (<><PageHeader breadcrumb={breadcrumb} title="Edit category" /><ErrorState error={existing.error} onRetry={existing.reload} /></>);

  const parentOptions = (parents.data?.items ?? []).filter((item) => item.id !== id).map((item) => ({ value: item.id, label: item.parent ? `— ${item.name}` : item.name }));

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        breadcrumb={breadcrumb}
        title={editing ? `Edit “${existing.data?.name}”` : 'Add Category'}
        description={editing ? 'Update details, images and SEO.' : 'Create a category or subcategory for your products.'}
        actions={(
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>{t('Cancel')}</Button>
            <Button type="submit" icon={Save} busy={saving} busyLabel="Saving…">{editing ? 'Save changes' : 'Create category'}</Button>
          </>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection title="Basic information" description="Name, URL and how the category is identified.">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput label="Category name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Herbal Oils" className="sm:col-span-2" />
              <FormInput label="Slug" value={form.slug} onChange={(event) => { setSlugTouched(true); set('slug')(slugify(event.target.value)); }} error={errors.slug} hint="Auto-generated from the name. Must be unique." prefix="/" />
              <FormInput label="Category code" value={form.code} onChange={(event) => set('code')(event.target.value.toUpperCase())} error={errors.code} hint="Leave empty to auto-generate." placeholder="CAT-OILS" />
              <TextArea label="Short description" rows={2} value={form.shortDescription} onChange={set('shortDescription')} error={errors.shortDescription} hint={`${form.shortDescription.length}/300`} className="sm:col-span-2" />
              <TextArea label="Full description" rows={6} value={form.description} onChange={set('description')} error={errors.description} className="sm:col-span-2" />
            </div>
          </FormSection>

          <FormSection title="Search engine optimisation" description="How this category appears in search results.">
            <div className="grid gap-5">
              <FormInput label="SEO title" value={form.seo.title} onChange={setSeo('title')} error={errors['seo.title']} hint={`${form.seo.title.length}/160`} placeholder={form.name} />
              <TextArea label="SEO description" rows={3} value={form.seo.description} onChange={setSeo('description')} error={errors['seo.description']} hint={`${form.seo.description.length}/320`} />
              <TagInput label="SEO keywords" value={form.seo.keywords} onChange={setSeo('keywords')} />
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Visibility">
            <div className="space-y-5">
              <Toggle checked={form.status === 'active'} onChange={(value) => set('status')(value ? 'active' : 'inactive')} label={form.status === 'active' ? 'Active' : 'Inactive'} description="Inactive categories are hidden from the store." />
              <Toggle checked={form.isFeatured} onChange={set('isFeatured')} label="Featured category" description="Highlight this category on the storefront." />
              <SelectInput label="Parent category" value={form.parent} onChange={set('parent')} options={parentOptions} placeholder="None (top level)" error={errors.parent} />
              <FormInput label="Display order" type="number" value={form.displayOrder} onChange={set('displayOrder')} hint="Lower numbers appear first." />
            </div>
          </FormSection>
          <FormSection title="Images" description="JPG, PNG or WEBP up to 5 MB.">
            <div className="space-y-5">
              <ImageUploader label="Main category image" existing={existing.data?.image} {...images.image} onChange={(value) => setImages((current) => ({ ...current, image: value }))} />
              <ImageUploader label="Thumbnail image" aspect="aspect-square max-w-40" existing={existing.data?.thumbnail} {...images.thumbnail} onChange={(value) => setImages((current) => ({ ...current, thumbnail: value }))} />
            </div>
          </FormSection>
        </div>
      </div>
    </form>
  );
}
