import {
  BarChart3, Bell, Boxes, CreditCard, LayoutDashboard, Megaphone, Package, Settings, ShoppingCart, Star, Truck, UserCog, Users,
} from 'lucide-react';

/** Sidebar structure. `permission` hides an entry from roles that lack it. */
export const NAVIGATION = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', permission: 'dashboard.view', end: true },
  {
    label: 'Products', icon: Package, permission: 'catalog.manage', categoryShortcuts: true,
    children: [
      { label: 'All Products', to: '/products', end: true },
      { label: 'Add Product', to: '/products/new' },
      { label: 'Product Categories', to: '/categories', end: true },
      { label: 'Add Category', to: '/categories/new' },
      { label: 'Featured Products', to: '/products/featured' },
      { label: 'New Arrivals', to: '/products/new-arrivals' },
      { label: 'Best Selling', to: '/products/best-selling' },
      { label: 'Stock Management', to: '/products/stock' },
    ],
  },
  {
    label: 'Orders', icon: ShoppingCart, permission: 'orders.manage', badge: 'pendingOrders',
    children: [
      { label: 'All Orders', to: '/orders', end: true },
      { label: 'Pending Orders', to: '/orders/status/pending' },
      { label: 'Processing Orders', to: '/orders/status/processing' },
      { label: 'Shipped Orders', to: '/orders/status/shipped' },
      { label: 'Delivered Orders', to: '/orders/status/delivered' },
      { label: 'Cancelled Orders', to: '/orders/status/cancelled' },
      { label: 'Returned Orders', to: '/orders/status/returned' },
    ],
  },
  {
    label: 'Customers', icon: Users, permission: 'customers.manage',
    children: [
      { label: 'Customer List', to: '/customers', end: true },
      { label: 'Customer Details', to: '/customers/details' },
    ],
  },
  {
    label: 'Users', icon: UserCog, permission: 'users.manage',
    children: [
      { label: 'User List', to: '/users', end: true },
      { label: 'Add User', to: '/users/new' },
      { label: 'Admin Users', to: '/users/admins' },
      { label: 'Roles & Permissions', to: '/users/roles' },
    ],
  },
  {
    label: 'Inventory', icon: Boxes, permission: 'inventory.manage',
    children: [
      { label: 'Stock Overview', to: '/inventory', end: true },
      { label: 'Low Stock Products', to: '/inventory/low-stock' },
      { label: 'Out of Stock Products', to: '/inventory/out-of-stock' },
    ],
  },
  {
    label: 'Marketing', icon: Megaphone, permission: 'marketing.manage',
    children: [
      { label: 'Coupons', to: '/marketing/coupons' },
      { label: 'Discounts', to: '/marketing/discounts' },
      { label: 'Banners', to: '/marketing/banners' },
      { label: 'Sliders', to: '/marketing/sliders' },
    ],
  },
  {
    label: 'Reports & Analytics', icon: BarChart3, permission: 'reports.view',
    children: [
      { label: 'Sales Reports', to: '/reports/sales' },
      { label: 'Revenue Reports', to: '/reports/revenue' },
      { label: 'Product Reports', to: '/reports/products' },
      { label: 'Category Reports', to: '/reports/categories' },
      { label: 'Customer Reports', to: '/reports/customers' },
      { label: 'Order Reports', to: '/reports/orders' },
      { label: 'Inventory Reports', to: '/reports/inventory' },
    ],
  },
  { label: 'Reviews & Ratings', icon: Star, to: '/reviews', permission: 'reviews.manage' },
  { label: 'Payments', icon: CreditCard, to: '/payments', permission: 'orders.manage' },
  { label: 'Shipping Management', icon: Truck, to: '/shipping', permission: 'shipping.manage' },
  { label: 'Notifications', icon: Bell, to: '/notifications', permission: 'dashboard.view', badge: 'notifications' },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'General Settings', to: '/settings/general', permission: 'settings.manage' },
      { label: 'Store Settings', to: '/settings/store', permission: 'settings.manage' },
      { label: 'Profile Settings', to: '/settings/profile' },
      { label: 'Security Settings', to: '/settings/security' },
    ],
  },
];

/** Flat list of { label, to, section } used for breadcrumbs and the command search. */
export const FLAT_NAVIGATION = NAVIGATION.flatMap((item) => (item.children
  ? item.children.map((child) => ({ ...child, section: item.label, icon: item.icon, permission: child.permission ?? item.permission }))
  : [{ ...item, section: null }]));
