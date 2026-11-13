import { Guard } from '@/shells/AdminShell.jsx';
import CustomerDetailsPage from '@/views/customers/CustomerDetailsPage.jsx';

export default function Page() {
  return <Guard permission="customers.manage"><CustomerDetailsPage /></Guard>;
}
