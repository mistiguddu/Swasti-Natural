import { Guard } from '@/shells/AdminShell.jsx';
import PaymentsPage from '@/views/orders/PaymentsPage.jsx';

export default function Page() {
  return <Guard permission="orders.manage"><PaymentsPage /></Guard>;
}
