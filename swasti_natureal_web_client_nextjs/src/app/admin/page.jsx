import { Guard } from '@/shells/AdminShell.jsx';
import DashboardPage from '@/views/dashboard/DashboardPage.jsx';

export default function Page() {
  return <Guard permission="dashboard.view"><DashboardPage /></Guard>;
}
