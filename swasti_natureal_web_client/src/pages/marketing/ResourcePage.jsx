import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, toFormData } from '../../api.js';
import { useApi, useListParams } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import DataTable, { BulkBar } from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { FilterDropdown, SearchInput } from '../../components/ui/Controls.jsx';
import { FormInput, SelectInput, TextArea, Toggle, fieldErrors } from '../../components/ui/Form.jsx';
import { ImageUploader } from '../../components/ui/ImageUploader.jsx';
import AsyncPicker from '../../components/ui/AsyncPicker.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmationModal, DetailsDrawer } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import NotFoundPage from '../NotFoundPage.jsx';
import { RESOURCES } from './resources.jsx';
import { t } from '../../i18n/index.js';

/** Chips + search picker for categories/products (stores ids, shows names). */
function MultiSelect({ field, value, onChange }) {
  const [labels, setLabels] = useState({});
  const endpoint = field.source === 'categories' ? '/categories' : '/products';
  useEffect(() => {
    if (!value.length) return;
    api.get(endpoint, { all: 'true' }).then((data) => setLabels(Object.fromEntries(data.items.map((item) => [item.id, item.name])))).catch(() => {});
  }, [endpoint, value.length]);
  return (
    <div>
      <AsyncPicker
        label={field.label}
        placeholder={`Search ${field.source}…`}
        fetchOptions={(search) => api.get(endpoint, { search, all: 'true' }).then((data) => data.items.filter((item) => !value.includes(item.id)).slice(0, 10))}
        renderItem={(item) => <span className="font-medium text-slate-800">{item.name}</span>}
        onSelect={(item) => { setLabels((current) => ({ ...current, [item.id]: item.name })); onChange([...value, item.id]); }}
      />
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 py-0.5 pr-1 pl-2 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
              {labels[id] ?? '…'}
              <button type="button" onClick={() => onChange(value.filter((item) => item !== id))} className="cursor-pointer rounded p-0.5 hover:bg-teal-100" aria-label="Remove"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceForm({ config, initial, existingImage, errors, onChange, image, onImage }) {
  const values = initial;
  const set = (field) => (event) => {
    const raw = event?.target ? event.target.value : event;
    onChange({ ...values, [field.name]: field.transform ? field.transform(raw) : raw });
  };
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {config.fields.filter((field) => !field.visible || field.visible(values)).map((field) => {
        const common = { label: field.label, required: field.required, hint: field.hint, error: errors[field.name], className: field.span === 2 ? 'sm:col-span-2' : '' };
        switch (field.type) {
          case 'textarea': return <TextArea key={field.name} {...common} rows={3} value={values[field.name] ?? ''} onChange={set(field)} />;
          case 'select': return <SelectInput key={field.name} {...common} value={values[field.name] ?? ''} onChange={set(field)} options={field.options} />;
          case 'number': return <FormInput key={field.name} {...common} type="number" min="0" step="any" value={values[field.name] ?? ''} onChange={set(field)} />;
          case 'date': return <FormInput key={field.name} {...common} type="date" value={values[field.name] ?? ''} onChange={set(field)} />;
          case 'image': return <div key={field.name} className="sm:col-span-2"><ImageUploader label={field.label} existing={existingImage} {...image} onChange={onImage} aspect="aspect-[16/7]" /></div>;
          case 'multiselect': return <div key={field.name} className="sm:col-span-2"><MultiSelect field={field} value={values[field.name] ?? []} onChange={set(field)} />{errors[field.name] && <p className="mt-1 text-xs text-rose-600">{errors[field.name]}</p>}</div>;
          default: return <FormInput key={field.name} {...common} value={values[field.name] ?? ''} onChange={set(field)} placeholder={field.placeholder} />;
        }
      })}
      <div className="sm:col-span-2">
        <Toggle checked={values.status === 'active'} onChange={(checked) => onChange({ ...values, status: checked ? 'active' : 'inactive' })} label={values.status === 'active' ? 'Active' : 'Inactive'} />
      </div>
    </div>
  );
}

export default function ResourcePage({ resource: fixed }) {
  const { resource: param } = useParams();
  const key = fixed ?? param;
  const config = RESOURCES[key];
  const toast = useToast();
  const { params, update, toggleSort, key: listKey } = useListParams(config?.defaultSort ?? {});
  const result = useApi(() => api.get(config.endpoint, params).then((value) => ({ key, value })), [listKey, key], { enabled: Boolean(config) });
  const { loading, error, reload } = result;
  // Only use data that belongs to the resource on screen (avoids rendering coupons with discount columns).
  const data = result.data?.key === key ? result.data.value : null;
  const setData = (updater) => result.setData((current) => ({ ...current, value: updater(current.value) }));
  const [selected, setSelected] = useState(new Set());
  const [editor, setEditor] = useState(null);
  const [image, setImage] = useState({ file: null, removed: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { setSelected(new Set()); setEditor(null); }, [key]);
  if (!config) return <NotFoundPage />;

  const open = (row) => {
    setErrors({});
    setImage({ file: null, removed: false });
    setEditor(row ? { id: row.id, values: config.toForm(row), image: row.image } : { id: null, values: { ...config.defaults } });
  };

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const values = { ...editor.values, removeImage: image.removed };
      const body = config.multipart ? toFormData(values, { image: image.file }) : values;
      if (editor.id) await api.put(`${config.endpoint}/${editor.id}`, body);
      else await api.post(config.endpoint, body);
      toast.success(`${config.singular} ${editor.id ? 'updated' : 'created'}`);
      setEditor(null);
      reload();
    } catch (requestError) {
      setErrors(fieldErrors(requestError));
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row, active) {
    const status = active ? 'active' : 'inactive';
    setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, status } : item)) }));
    try {
      await api.patch(`${config.endpoint}/${row.id}/status`, { status });
    } catch (requestError) {
      setData((current) => ({ ...current, items: current.items.map((item) => (item.id === row.id ? { ...item, status: row.status } : item)) }));
      toast.error(requestError.message);
    }
  }

  async function runConfirmed() {
    setSaving(true);
    try {
      if (confirm.row) await api.delete(`${config.endpoint}/${confirm.row.id}`);
      else await api.post(`${config.endpoint}/bulk-delete`, { ids: [...selected] });
      toast.success('Deleted');
      setSelected(new Set());
      setConfirm(null);
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function bulkStatus(status) {
    try {
      const result = await api.patch(`${config.endpoint}/bulk-status`, { ids: [...selected], status });
      toast.success(`${result.updated} updated`);
      setSelected(new Set());
      reload();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  }

  const Icon = config.icon;
  const columns = [
    ...config.columns,
    {
      key: 'status', header: 'Status', render: (row) => {
        const state = config.schedule?.(row) ?? { status: row.status };
        return <div className="flex items-center gap-2"><Toggle size="sm" checked={row.status === 'active'} onChange={(value) => toggleStatus(row, value)} /><StatusBadge status={state.status} label={state.label} /></div>;
      },
    },
    {
      key: 'actions', header: <span className="sr-only">{t('Actions')}</span>, className: 'text-right', render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Pencil} variant="teal" label="Edit" onClick={() => open(row)} />
          <IconButton icon={Trash2} variant="danger" label="Delete" onClick={() => setConfirm({ row })} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={config.title} description={config.description} actions={<Button icon={Plus} onClick={() => open(null)}>Add {config.singular.toLowerCase()}</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={params.search ?? ''} onSearch={(search) => update({ search })} placeholder={`Search ${config.title.toLowerCase()}…`} className="w-full sm:w-72" />
          <FilterDropdown label="Status" value={params.status ?? ''} onChange={(status) => update({ status })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          {config.filters?.map((filter) => <FilterDropdown key={filter.name} label={filter.label} value={params[filter.name] ?? ''} onChange={(value) => update({ [filter.name]: value })} options={filter.options} />)}
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('active')}>{t('Activate')}</Button>
          <Button size="sm" variant="secondary" onClick={() => bulkStatus('inactive')}>{t('Deactivate')}</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({})}>{t('Delete')}</Button>
        </BulkBar>
        <DataTable
          columns={columns} rows={data?.items} loading={loading} error={error} onRetry={reload}
          selection={{ selected, onChange: setSelected }}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder, onSort: toggleSort }}
          skeleton={<TableSkeleton columns={['w-4', 'w-20 h-10 rounded-lg', 'w-40', 'w-20', 'w-16', 'w-24', 'w-16']} />}
          empty={<EmptyState icon={Icon} title={`No ${config.title.toLowerCase()} yet`} action={<Button icon={Plus} onClick={() => open(null)}>Add {config.singular.toLowerCase()}</Button>} />}
        />
        <Pagination pagination={data?.pagination} onPageChange={(page) => update({ page }, { resetPage: false })} onLimitChange={(limit) => update({ limit })} />
      </Card>

      <DetailsDrawer
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor?.id ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        footer={<><Button variant="secondary" onClick={() => setEditor(null)} disabled={saving}>{t('Cancel')}</Button><Button onClick={save} busy={saving} busyLabel="Saving…">{editor?.id ? 'Save changes' : 'Create'}</Button></>}
      >
        {editor && (
          <form onSubmit={(event) => { event.preventDefault(); save(); }}>
            <ResourceForm config={config} initial={editor.values} existingImage={editor.image} errors={errors} onChange={(values) => setEditor((current) => ({ ...current, values }))} image={image} onImage={setImage} />
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        )}
      </DetailsDrawer>
      <ConfirmationModal open={Boolean(confirm)} busy={saving} onClose={() => setConfirm(null)} onConfirm={runConfirmed} title={confirm?.row ? `Delete this ${config.singular.toLowerCase()}?` : `Delete ${selected.size} item(s)?`} message="This can’t be undone." />
    </>
  );
}
