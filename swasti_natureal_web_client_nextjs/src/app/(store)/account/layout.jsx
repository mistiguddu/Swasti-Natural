import { RouteOutlet } from '@/router';
import { AccountLayout } from '@/store/pages/AccountPages.jsx';

/** The account sidebar layout; its <Outlet /> renders the account page. */
export default function AccountRouteLayout({ children }) {
  return <RouteOutlet content={children}><AccountLayout /></RouteOutlet>;
}
