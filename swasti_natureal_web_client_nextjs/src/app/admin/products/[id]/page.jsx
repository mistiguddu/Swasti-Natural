import { Guard } from '@/shells/AdminShell.jsx';
import ProductDetailsPage from '@/views/products/ProductDetailsPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><ProductDetailsPage /></Guard>;
}
