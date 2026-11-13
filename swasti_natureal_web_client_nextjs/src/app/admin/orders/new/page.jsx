import { Guard } from '@/shells/AdminShell.jsx';
import OrderCreatePage from '@/views/orders/OrderCreatePage.jsx';

export default function Page() {
  return <Guard permission="orders.manage"><OrderCreatePage /></Guard>;
}
