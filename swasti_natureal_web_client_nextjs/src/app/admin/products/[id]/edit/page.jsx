import { Guard } from '@/shells/AdminShell.jsx';
import ProductFormPage from '@/views/products/ProductFormPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><ProductFormPage /></Guard>;
}
