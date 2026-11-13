import { Guard } from '@/shells/AdminShell.jsx';
import CustomerListPage from '@/views/customers/CustomerListPage.jsx';

export default function Page() {
  return <Guard permission="customers.manage"><CustomerListPage /></Guard>;
}
