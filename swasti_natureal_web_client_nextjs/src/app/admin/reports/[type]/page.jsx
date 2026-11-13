import { Guard } from '@/shells/AdminShell.jsx';
import ReportPage from '@/views/reports/ReportPage.jsx';

export default function Page() {
  return <Guard permission="reports.view"><ReportPage /></Guard>;
}
