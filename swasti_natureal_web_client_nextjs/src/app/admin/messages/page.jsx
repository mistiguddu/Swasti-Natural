import { Guard } from '@/shells/AdminShell.jsx';
import MessagesPage from '@/views/MessagesPage.jsx';

export default function Page() {
  return <Guard permission="customers.manage"><MessagesPage /></Guard>;
}
