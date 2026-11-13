import { Guard } from '@/shells/AdminShell.jsx';
import SettingsPage from '@/views/settings/SettingsPage.jsx';

export default function Page() {
  return <Guard><SettingsPage /></Guard>;
}
