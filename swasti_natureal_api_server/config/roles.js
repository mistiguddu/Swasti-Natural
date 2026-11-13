/** Permission catalogue used by `requirePermission()` and shown on the Roles & Permissions page. */
export const PERMISSIONS = [
  { key: 'dashboard.view', group: 'General', label: 'View dashboard' },
  { key: 'reports.view', group: 'General', label: 'View reports & analytics' },
  { key: 'catalog.manage', group: 'Catalog', label: 'Manage products & categories' },
  { key: 'inventory.manage', group: 'Catalog', label: 'Manage stock' },
  { key: 'orders.manage', group: 'Sales', label: 'Manage orders & payments' },
  { key: 'customers.manage', group: 'Sales', label: 'Manage customers' },
  { key: 'marketing.manage', group: 'Sales', label: 'Manage coupons, discounts, banners & sliders' },
  { key: 'reviews.manage', group: 'Sales', label: 'Moderate reviews' },
  { key: 'shipping.manage', group: 'Operations', label: 'Manage shipping methods' },
  { key: 'settings.manage', group: 'Operations', label: 'Manage store settings' },
  { key: 'users.manage', group: 'Administration', label: 'Manage customer accounts' },
  { key: 'admins.manage', group: 'Administration', label: 'Manage admin & super admin accounts' },
];

const ALL = PERMISSIONS.map((permission) => permission.key);

export const ROLE_DEFINITIONS = {
  superadmin: {
    label: 'Super Administrator',
    description: 'Full access, including managing other administrators.',
    permissions: ALL,
  },
  admin: {
    label: 'Administrator',
    description: 'Runs the store day to day. Cannot manage administrator accounts.',
    permissions: ALL.filter((key) => key !== 'admins.manage'),
  },
  user: {
    label: 'Customer',
    description: 'Shops on the storefront. No access to the admin dashboard.',
    permissions: [],
  },
};

/** Roles a super admin may temporarily act as ("view as") without signing out. */
export const VIEW_AS_ROLES = { superadmin: ['admin'] };

/**
 * The role a request acts with. A super admin in "view as admin" mode has
 * `user.$locals.viewAs` set by `authenticate`, and is then treated exactly like an admin.
 */
export function effectiveRole(user) {
  return user?.$locals?.viewAs ?? user?.role;
}

export function permissionsFor(user) {
  return ROLE_DEFINITIONS[effectiveRole(user)]?.permissions ?? [];
}

export function hasPermission(user, permission) {
  return Boolean(user && permissionsFor(user).includes(permission));
}

export function isStaff(user) {
  return user?.role === 'admin' || user?.role === 'superadmin';
}
