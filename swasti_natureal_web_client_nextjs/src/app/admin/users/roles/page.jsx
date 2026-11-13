import { Guard } from '@/shells/AdminShell.jsx';
import RolesPage from '@/views/users/RolesPage.jsx';

export default function Page() {
  return <Guard permission="users.manage"><RolesPage /></Guard>;
}
