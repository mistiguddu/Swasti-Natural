import { Guard } from '@/shells/AdminShell.jsx';
import DatabasePage from '@/views/DatabasePage.jsx';

export default function Page() {
  return <Guard permission="database.manage"><DatabasePage /></Guard>;
}
