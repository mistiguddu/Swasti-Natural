import { Guard } from '@/shells/AdminShell.jsx';
import UserListPage from '@/views/users/UserListPage.jsx';

export default function Page() {
  return <Guard permission="users.manage"><UserListPage preset="staff" /></Guard>;
}
