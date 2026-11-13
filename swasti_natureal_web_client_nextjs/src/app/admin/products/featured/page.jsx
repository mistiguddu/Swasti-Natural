import { Guard } from '@/shells/AdminShell.jsx';
import ProductListPage from '@/views/products/ProductListPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><ProductListPage preset="featured" /></Guard>;
}
