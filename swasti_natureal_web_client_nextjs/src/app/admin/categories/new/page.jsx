import { Guard } from '@/shells/AdminShell.jsx';
import CategoryFormPage from '@/views/categories/CategoryFormPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><CategoryFormPage /></Guard>;
}
