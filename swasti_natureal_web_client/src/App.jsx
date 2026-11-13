import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useApplyTheme } from './context/PreferencesContext.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import { NoAccessScreen, SessionErrorScreen } from './pages/auth/SessionScreens.jsx';
import { AppShellSkeleton, DashboardCardSkeleton, DashboardChartSkeleton, Skeleton } from './components/ui/Skeleton.jsx';

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.jsx'));
const CategoryListPage = lazy(() => import('./pages/categories/CategoryListPage.jsx'));
const CategoryFormPage = lazy(() => import('./pages/categories/CategoryFormPage.jsx'));
const CategoryDetailsPage = lazy(() => import('./pages/categories/CategoryDetailsPage.jsx'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage.jsx'));
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage.jsx'));
const ProductDetailsPage = lazy(() => import('./pages/products/ProductDetailsPage.jsx'));
const StockManagementPage = lazy(() => import('./pages/products/StockManagementPage.jsx'));
const StockOverviewPage = lazy(() => import('./pages/products/StockOverviewPage.jsx'));
const OrderListPage = lazy(() => import('./pages/orders/OrderListPage.jsx'));
const OrderDetailsPage = lazy(() => import('./pages/orders/OrderDetailsPage.jsx'));
const OrderCreatePage = lazy(() => import('./pages/orders/OrderCreatePage.jsx'));
const PaymentsPage = lazy(() => import('./pages/orders/PaymentsPage.jsx'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage.jsx'));
const CustomerDetailsPage = lazy(() => import('./pages/customers/CustomerDetailsPage.jsx'));
const UserListPage = lazy(() => import('./pages/users/UserListPage.jsx'));
const UserFormPage = lazy(() => import('./pages/users/UserFormPage.jsx'));
const UserDetailsPage = lazy(() => import('./pages/users/UserDetailsPage.jsx'));
const RolesPage = lazy(() => import('./pages/users/RolesPage.jsx'));
const ResourcePage = lazy(() => import('./pages/marketing/ResourcePage.jsx'));
const ReportPage = lazy(() => import('./pages/reports/ReportPage.jsx'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-64" />
      <DashboardCardSkeleton />
      <DashboardChartSkeleton />
    </div>
  );
}

/** Renders the page only when the user has `permission`. */
function Guard({ permission, children }) {
  const { can } = useAuth();
  return !permission || can(permission) ? children : <NotFoundPage forbidden />;
}

const page = (element, permission) => <Guard permission={permission}>{element}</Guard>;

export default function App() {
  const auth = useAuth();
  // Theme applies to the signed-in app; the login page keeps its own light design.
  useApplyTheme(auth.status !== 'signed-out');

  if (auth.status === 'loading') return <AppShellSkeleton />;
  if (auth.status === 'error') return <SessionErrorScreen message={auth.error} onRetry={auth.retry} onLogout={auth.signOut} />;
  if (auth.status !== 'signed-in') return <LoginPage />;
  if (!auth.can('dashboard.view')) return <NoAccessScreen user={auth.user} onLogout={auth.signOut} />;

  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Suspense fallback={<PageSkeleton />}>{page(<DashboardPage />, 'dashboard.view')}</Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageSkeleton />}><AdminRoutes /></Suspense>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="categories" element={page(<CategoryListPage />, 'catalog.manage')} />
      <Route path="categories/new" element={page(<CategoryFormPage />, 'catalog.manage')} />
      <Route path="categories/:id" element={page(<CategoryDetailsPage />, 'catalog.manage')} />
      <Route path="categories/:id/edit" element={page(<CategoryFormPage />, 'catalog.manage')} />
      <Route path="categories/:categoryId/products" element={page(<ProductListPage />, 'catalog.manage')} />

      <Route path="products" element={page(<ProductListPage />, 'catalog.manage')} />
      <Route path="products/featured" element={page(<ProductListPage preset="featured" />, 'catalog.manage')} />
      <Route path="products/new-arrivals" element={page(<ProductListPage preset="newArrival" />, 'catalog.manage')} />
      <Route path="products/best-selling" element={page(<ProductListPage preset="bestSelling" />, 'catalog.manage')} />
      <Route path="products/stock" element={page(<StockManagementPage />, 'inventory.manage')} />
      <Route path="products/new" element={page(<ProductFormPage />, 'catalog.manage')} />
      <Route path="products/:id" element={page(<ProductDetailsPage />, 'catalog.manage')} />
      <Route path="products/:id/edit" element={page(<ProductFormPage />, 'catalog.manage')} />

      <Route path="inventory" element={page(<StockOverviewPage />, 'inventory.manage')} />
      <Route path="inventory/low-stock" element={page(<StockManagementPage preset="low" />, 'inventory.manage')} />
      <Route path="inventory/out-of-stock" element={page(<StockManagementPage preset="out_of_stock" />, 'inventory.manage')} />

      <Route path="orders" element={page(<OrderListPage />, 'orders.manage')} />
      <Route path="orders/status/:status" element={page(<OrderListPage />, 'orders.manage')} />
      <Route path="orders/new" element={page(<OrderCreatePage />, 'orders.manage')} />
      <Route path="orders/:id" element={page(<OrderDetailsPage />, 'orders.manage')} />
      <Route path="payments" element={page(<PaymentsPage />, 'orders.manage')} />

      <Route path="customers" element={page(<CustomerListPage />, 'customers.manage')} />
      <Route path="customers/details" element={page(<CustomerDetailsPage />, 'customers.manage')} />
      <Route path="customers/:id" element={page(<CustomerDetailsPage />, 'customers.manage')} />

      <Route path="users" element={page(<UserListPage />, 'users.manage')} />
      <Route path="users/admins" element={page(<UserListPage preset="staff" />, 'users.manage')} />
      <Route path="users/roles" element={page(<RolesPage />, 'users.manage')} />
      <Route path="users/new" element={page(<UserFormPage />, 'users.manage')} />
      <Route path="users/:id" element={page(<UserDetailsPage />, 'users.manage')} />
      <Route path="users/:id/edit" element={page(<UserFormPage />, 'users.manage')} />

      <Route path="marketing/:resource" element={page(<ResourcePage />, 'marketing.manage')} />
      <Route path="shipping" element={page(<ResourcePage resource="shipping" />, 'shipping.manage')} />
      <Route path="reports" element={<Navigate to="/reports/sales" replace />} />
      <Route path="reports/:type" element={page(<ReportPage />, 'reports.view')} />
      <Route path="reviews" element={page(<ReviewsPage />, 'reviews.manage')} />
      <Route path="notifications" element={page(<NotificationsPage />, 'dashboard.view')} />
      <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
      <Route path="settings/:section" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
