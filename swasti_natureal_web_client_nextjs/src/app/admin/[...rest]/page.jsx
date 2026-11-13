import { Guard } from '@/shells/AdminShell.jsx';
import NotFoundPage from '@/views/NotFoundPage.jsx';

export default function Page() {
  return <Guard><NotFoundPage /></Guard>;
}
