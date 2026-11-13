import { Guard } from '@/shells/AdminShell.jsx';
import CategoryDetailsPage from '@/views/categories/CategoryDetailsPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><CategoryDetailsPage /></Guard>;
}
