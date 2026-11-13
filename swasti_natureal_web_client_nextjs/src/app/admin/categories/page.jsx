import { Guard } from '@/shells/AdminShell.jsx';
import CategoryListPage from '@/views/categories/CategoryListPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><CategoryListPage /></Guard>;
}
