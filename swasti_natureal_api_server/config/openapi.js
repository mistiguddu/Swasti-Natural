import swaggerUi from 'swagger-ui-express';

export { swaggerUi };

const secured = { security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' }, 400: { description: 'Invalid input' }, 401: { description: 'Unauthenticated' }, 403: { description: 'Forbidden' }, 404: { description: 'Not found' } } };
const op = (summary, tag) => ({ ...secured, summary, tags: [tag] });
const crud = (base, label, tag) => ({
  [base]: { get: op(`List ${label}`, tag), post: op(`Create ${label}`, tag) },
  [`${base}/{id}`]: { get: op(`Get ${label}`, tag), put: op(`Update ${label}`, tag), delete: op(`Delete ${label}`, tag) },
  [`${base}/{id}/status`]: { patch: op(`Set ${label} status`, tag) },
  [`${base}/bulk-delete`]: { post: op(`Bulk delete ${label}`, tag) },
  [`${base}/bulk-status`]: { patch: op(`Bulk update ${label} status`, tag) },
});

const adminPaths = {
  ...crud('/categories', 'categories (multipart: data JSON + image, thumbnail)', 'Categories'),
  '/categories/{categoryId}/products': { get: op('Products in a category', 'Categories') },
  '/categories/{id}/featured': { patch: op('Toggle featured', 'Categories') },
  ...crud('/products', 'products (multipart: data JSON + image, thumbnail, gallery[])', 'Products'),
  '/products/{id}/duplicate': { post: op('Duplicate product', 'Products') },
  '/products/{id}/featured': { patch: op('Toggle featured', 'Products') },
  '/products/{id}/stock': { patch: op('Set or adjust stock', 'Products') },
  '/products/inventory/summary': { get: op('Inventory summary', 'Products') },
  '/orders': { get: op('List orders', 'Orders'), post: op('Create order', 'Orders') },
  '/orders/{id}': { get: op('Get order', 'Orders') },
  '/orders/{id}/status': { patch: op('Update order status', 'Orders') },
  '/orders/{id}/payment': { patch: op('Update payment status', 'Orders') },
  '/customers': { get: op('List customers', 'Customers') },
  '/customers/{id}': { get: op('Get customer', 'Customers') },
  '/users': { get: op('List users', 'Users'), post: op('Create user', 'Users') },
  '/users/roles': { get: op('Roles & permissions', 'Users') },
  '/users/{id}': { get: op('Get user', 'Users'), put: op('Update user', 'Users'), delete: op('Delete user', 'Users') },
  '/users/{id}/status': { patch: op('Activate / deactivate user', 'Users') },
  ...Object.fromEntries(['overview', 'sales', 'revenue', 'top-products', 'top-categories', 'order-stats', 'customer-growth', 'recent-orders', 'activities']
    .map((name) => [`/dashboard/${name}`, { get: op(`Dashboard ${name}`, 'Dashboard') }])),
  ...Object.fromEntries(['sales', 'revenue', 'products', 'categories', 'customers', 'orders', 'inventory']
    .map((name) => [`/reports/${name}`, { get: op(`${name} report`, 'Reports') }])),
  ...crud('/coupons', 'coupons', 'Marketing'),
  ...crud('/discounts', 'discounts', 'Marketing'),
  ...crud('/banners', 'banners (multipart: data JSON + image)', 'Marketing'),
  ...crud('/sliders', 'sliders (multipart: data JSON + image)', 'Marketing'),
  ...crud('/shipping-methods', 'shipping methods', 'Shipping'),
  '/reviews': { get: op('List reviews', 'Reviews'), post: op('Create review (customer)', 'Reviews') },
  '/reviews/{id}': { get: op('Get review', 'Reviews'), patch: op('Moderate review', 'Reviews'), delete: op('Delete review', 'Reviews') },
  '/notifications': { get: op('List notifications', 'Notifications') },
  '/notifications/read-all': { patch: op('Mark all read', 'Notifications') },
  '/notifications/{id}/read': { patch: op('Mark read', 'Notifications') },
  '/settings': { get: op('Get settings', 'Settings') },
  '/settings/general': { put: op('Update general settings', 'Settings') },
  '/settings/store': { put: op('Update store settings', 'Settings') },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Swasti Natural API', version: '1.0.0', description: 'Authentication and e-commerce administration API. List endpoints accept page, limit, search, sortBy, sortOrder, status and (for analytics) range=today|7d|30d|month|year|custom with from/to (YYYY-MM-DD).' },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/auth/register': { post: { summary: 'Register a user', responses: { 201: { description: 'User registered' }, 400: { description: 'Invalid input' } } } },
    '/auth/login': { post: { summary: 'Create a JWT session', responses: { 200: { description: 'Authenticated' }, 401: { description: 'Invalid credentials' } } } },
    '/auth/me': { get: { summary: 'Get current user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Current user' } } } },
    ...adminPaths,
  },
};