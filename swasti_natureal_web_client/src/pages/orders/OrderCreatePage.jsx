import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Save, Trash2, UserRound, X } from 'lucide-react';
import { api } from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { FormInput, FormSection, SelectInput, TextArea, Toggle } from '../../components/ui/Form.jsx';
import AsyncPicker from '../../components/ui/AsyncPicker.jsx';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { money, PAYMENT_METHOD_LABELS, PAYMENT_STATUSES, titleCase } from '../../lib/format.js';

const ADDRESS = { name: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '' };

function AddressFields({ value, onChange }) {
  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Recipient name" value={value.name} onChange={set('name')} />
      <FormInput label="Phone" value={value.phone} onChange={set('phone')} />
      <FormInput label="Address line 1" value={value.line1} onChange={set('line1')} className="sm:col-span-2" />
      <FormInput label="Address line 2" value={value.line2} onChange={set('line2')} className="sm:col-span-2" />
      <FormInput label="City" value={value.city} onChange={set('city')} />
      <FormInput label="State / Division" value={value.state} onChange={set('state')} />
      <FormInput label="Postal code" value={value.postalCode} onChange={set('postalCode')} />
      <FormInput label="Country" value={value.country} onChange={set('country')} />
    </div>
  );
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [lines, setLines] = useState([]);
  const [shipping, setShipping] = useState(ADDRESS);
  const [billing, setBilling] = useState(ADDRESS);
  const [sameAsShipping, setSame] = useState(true);
  const [form, setForm] = useState({ shippingMethod: '', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', couponCode: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { data: methods } = useApi(() => api.get('/shipping-methods', { status: 'active', limit: 100, sortBy: 'displayOrder', sortOrder: 'asc' }), []);

  const chooseCustomer = async (item) => {
    setCustomer(item);
    const address = item.address ?? {};
    setShipping({ ...ADDRESS, ...address, name: item.name, phone: item.phone ?? '' });
  };

  const addProduct = (product) => setLines((current) => {
    const existing = current.find((line) => line.product.id === product.id);
    if (existing) return current.map((line) => (line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line));
    return [...current, { product, quantity: 1 }];
  });

  const price = (product) => (product.salePrice > 0 && product.salePrice < product.regularPrice ? product.salePrice : product.regularPrice);
  const subtotal = lines.reduce((sum, line) => sum + price(line.product) * line.quantity, 0);
  const method = methods?.items?.find((item) => item.id === form.shippingMethod);
  const shippingEstimate = method ? (method.freeShippingThreshold > 0 && subtotal >= method.freeShippingThreshold ? 0 : method.charge) : 0;

  async function submit(event) {
    event.preventDefault();
    if (!customer) { toast.error('Choose a customer'); return; }
    if (!lines.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      const order = await api.post('/orders', {
        customer: customer.id,
        items: lines.map((line) => ({ product: line.product.id, quantity: line.quantity })),
        shippingAddress: shipping,
        billingAddress: sameAsShipping ? shipping : billing,
        sameAsShipping,
        ...form,
        shippingMethod: form.shippingMethod || null,
      });
      toast.success(`Order ${order.orderNumber} created`);
      navigate(`/orders/${order.id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        breadcrumb={[{ label: 'Orders', to: '/orders' }, { label: 'Create order' }]}
        title="Create order"
        description="Place an order on behalf of a customer (phone or in-store orders). Prices, discounts, coupon and tax are calculated by the server."
        actions={<><Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button><Button type="submit" icon={Save} busy={saving} busyLabel="Creating…">Create order</Button></>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <FormSection title="Customer">
            {customer ? (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 font-bold text-teal-700">{customer.name.charAt(0)}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{customer.name}</p><p className="truncate text-xs text-slate-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p></div>
                <IconButton icon={X} label="Change customer" onClick={() => setCustomer(null)} />
              </div>
            ) : (
              <AsyncPicker
                placeholder="Search customers by name, email or phone…"
                fetchOptions={(search) => api.get('/customers', { search, limit: 8 }).then((data) => data.items)}
                renderItem={(item) => (<><UserRound size={16} className="text-slate-400" /><span className="font-medium text-slate-800">{item.name}</span><span className="ml-auto truncate text-xs text-slate-500">{item.email}</span></>)}
                onSelect={chooseCustomer}
                emptyText="No customers found. Add one under Users → Add User with the Customer role."
              />
            )}
          </FormSection>

          <FormSection title="Products">
            <AsyncPicker
              placeholder="Search active products to add…"
              fetchOptions={(search) => api.get('/products', { search, status: 'active', all: 'true' }).then((data) => data.items.slice(0, 10))}
              renderItem={(item) => (<><Thumb src={item.thumbnail || item.image} size="h-8 w-8" icon={Package} /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-800">{item.name}</span><span className="text-xs text-slate-400">{item.sku} · {item.manageStock ? `${item.stockQuantity} in stock` : 'not tracked'}</span></span><span className="font-semibold tabular-nums">{money(price(item))}</span></>)}
              onSelect={addProduct}
            />
            {lines.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex flex-wrap items-center gap-3 p-3">
                    <Thumb src={line.product.thumbnail || line.product.image} size="h-10 w-10" icon={Package} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{line.product.name}</p><p className="text-xs text-slate-400">{money(price(line.product))} each</p></div>
                    <input type="number" min="1" value={line.quantity} aria-label={`Quantity of ${line.product.name}`} onChange={(event) => setLines((current) => current.map((item) => (item.product.id === line.product.id ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item)))} className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center text-sm outline-none focus:border-teal-500" />
                    <span className="w-24 text-right font-semibold tabular-nums">{money(price(line.product) * line.quantity)}</span>
                    <IconButton icon={Trash2} variant="danger" label={`Remove ${line.product.name}`} onClick={() => setLines((current) => current.filter((item) => item.product.id !== line.product.id))} />
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection title="Shipping address"><AddressFields value={shipping} onChange={setShipping} /></FormSection>
          <FormSection title="Billing address">
            <Toggle checked={sameAsShipping} onChange={setSame} label="Same as shipping address" />
            {!sameAsShipping && <div className="mt-5"><AddressFields value={billing} onChange={setBilling} /></div>}
          </FormSection>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <FormSection title="Payment & delivery">
            <div className="space-y-4">
              <SelectInput label="Shipping method" value={form.shippingMethod} onChange={(event) => setForm((current) => ({ ...current, shippingMethod: event.target.value }))} placeholder="No shipping charge" options={(methods?.items ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${money(item.charge)}` }))} />
              <SelectInput label="Payment method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
              <SelectInput label="Payment status" value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))} options={PAYMENT_STATUSES.map((value) => ({ value, label: titleCase(value) }))} />
              <FormInput label="Coupon code" value={form.couponCode} onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))} />
              <TextArea label="Order notes" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
          </FormSection>
          <FormSection title="Estimate" description="Before automatic discounts, coupon and tax.">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd className="tabular-nums">{money(shippingEstimate)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><dt>Estimated total</dt><dd className="tabular-nums">{money(subtotal + shippingEstimate)}</dd></div>
            </dl>
          </FormSection>
        </div>
      </div>
    </form>
  );
}
