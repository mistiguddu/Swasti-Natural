import { Guard } from '@/shells/AdminShell.jsx';
import UserDetailsPage from '@/views/users/UserDetailsPage.jsx';

export default function Page() {
  return <Guard permission="users.manage"><UserDetailsPage /></Guard>;
}
