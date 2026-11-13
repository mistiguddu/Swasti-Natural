import { Guard } from '@/shells/AdminShell.jsx';
import StockOverviewPage from '@/views/products/StockOverviewPage.jsx';

export default function Page() {
  return <Guard permission="inventory.manage"><StockOverviewPage /></Guard>;
}
