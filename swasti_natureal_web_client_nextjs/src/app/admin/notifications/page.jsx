import { Guard } from '@/shells/AdminShell.jsx';
import NotificationsPage from '@/views/NotificationsPage.jsx';

export default function Page() {
  return <Guard permission="dashboard.view"><NotificationsPage /></Guard>;
}
