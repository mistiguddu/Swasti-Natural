import { Guard } from '@/shells/AdminShell.jsx';
import UserFormPage from '@/views/users/UserFormPage.jsx';

export default function Page() {
  return <Guard permission="users.manage"><UserFormPage /></Guard>;
}
