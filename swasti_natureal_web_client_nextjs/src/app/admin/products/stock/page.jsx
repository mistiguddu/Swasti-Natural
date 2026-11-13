import { Guard } from '@/shells/AdminShell.jsx';
import StockManagementPage from '@/views/products/StockManagementPage.jsx';

export default function Page() {
  return <Guard permission="inventory.manage"><StockManagementPage /></Guard>;
}
