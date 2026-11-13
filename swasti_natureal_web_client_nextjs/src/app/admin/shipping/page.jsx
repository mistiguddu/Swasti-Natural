import { Guard } from '@/shells/AdminShell.jsx';
import ResourcePage from '@/views/marketing/ResourcePage.jsx';

export default function Page() {
  return <Guard permission="shipping.manage"><ResourcePage resource="shipping" /></Guard>;
}
