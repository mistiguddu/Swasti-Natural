import { Guard } from '@/shells/AdminShell.jsx';
import OrderDetailsPage from '@/views/orders/OrderDetailsPage.jsx';

export default function Page() {
  return <Guard permission="orders.manage"><OrderDetailsPage /></Guard>;
}
