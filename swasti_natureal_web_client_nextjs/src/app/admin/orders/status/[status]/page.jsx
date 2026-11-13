import { Guard } from '@/shells/AdminShell.jsx';
import OrderListPage from '@/views/orders/OrderListPage.jsx';

export default function Page() {
  return <Guard permission="orders.manage"><OrderListPage /></Guard>;
}
