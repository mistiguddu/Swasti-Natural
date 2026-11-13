import AdminShell from '@/shells/AdminShell.jsx';

export const metadata = { title: 'Swasti Natural Admin', robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
