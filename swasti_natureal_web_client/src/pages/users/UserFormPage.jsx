import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormInput, FormSection, SelectInput, Toggle, fieldErrors } from '../../components/ui/Form.jsx';
import { FormSkeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { ROLE_LABELS } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

const ADDRESS = { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' };

export default function UserFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', role: searchParams.get('role') ?? 'user', phone: '', isActive: true, password: '', address: ADDRESS });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const existing = useApi(() => api.get(`/users/${id}`), [id], { enabled: editing });

  useEffect(() => {
    const user = existing.data;
    if (user) setForm({ name: user.name, email: user.email, role: user.role, phone: user.phone ?? '', isActive: user.isActive, password: '', address: { ...ADDRESS, ...user.address } });
  }, [existing.data]);

  const roles = ['user', ...(can('admins.manage') ? ['admin', 'superadmin'] : [])];
  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const setAddress = (field) => (event) => setForm((current) => ({ ...current, address: { ...current.address, [field]: event.target.value } }));

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter a name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!editing && form.password.length < 8) next.password = 'At least 8 characters';
    if (editing && form.password && form.password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const saved = editing ? await api.put(`/users/${id}`, form) : await api.post('/users', form);
      toast.success(editing ? 'User updated' : 'User created');
      navigate(saved.role === 'user' ? `/customers/${saved.id}` : `/users/${saved.id}`);
    } catch (requestError) {
      setErrors(fieldErrors(requestError));
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = [{ label: 'Users', to: '/users' }, { label: editing ? 'Edit user' : 'Add User' }];
  if (editing && existing.loading) return (<><PageHeader breadcrumb={breadcrumb} title="Edit user" /><FormSkeleton /></>);
  if (editing && existing.error) return (<><PageHeader breadcrumb={breadcrumb} title="Edit user" /><ErrorState error={existing.error} onRetry={existing.reload} /></>);

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        breadcrumb={breadcrumb}
        title={editing ? `Edit ${existing.data?.name}` : 'Add User'}
        description={can('admins.manage') ? 'Create customers, administrators or super administrators.' : 'Administrators can create and edit customer accounts.'}
        actions={<><Button variant="secondary" onClick={() => navigate(-1)}>{t('Cancel')}</Button><Button type="submit" icon={Save} busy={saving} busyLabel="Saving…">{editing ? 'Save changes' : 'Create user'}</Button></>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection title="Account">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput label="Full name" required value={form.name} onChange={set('name')} error={errors.name} />
              <FormInput label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" />
              <FormInput label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
              <FormInput label={editing ? 'New password' : 'Password'} type="password" required={!editing} value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint={editing ? 'Leave empty to keep the current password.' : 'At least 8 characters.'} />
            </div>
          </FormSection>
          <FormSection title="Address">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput label="Address line 1" value={form.address.line1} onChange={setAddress('line1')} className="sm:col-span-2" />
              <FormInput label="Address line 2" value={form.address.line2} onChange={setAddress('line2')} className="sm:col-span-2" />
              <FormInput label="City" value={form.address.city} onChange={setAddress('city')} />
              <FormInput label="State / Division" value={form.address.state} onChange={setAddress('state')} />
              <FormInput label="Postal code" value={form.address.postalCode} onChange={setAddress('postalCode')} />
              <FormInput label="Country" value={form.address.country} onChange={setAddress('country')} />
            </div>
          </FormSection>
        </div>
        <div className="space-y-6">
          <FormSection title="Role & access">
            <div className="space-y-5">
              <SelectInput label="Role" value={form.role} onChange={set('role')} options={roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))} hint={form.role === 'user' ? 'Customers can’t open this dashboard.' : 'Can sign in to this dashboard.'} />
              <Toggle checked={form.isActive} onChange={set('isActive')} label={form.isActive ? 'Active' : 'Inactive'} description="Inactive accounts can’t sign in." />
            </div>
          </FormSection>
        </div>
      </div>
    </form>
  );
}
