import express from 'express';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { openApiDocument, swaggerUi } from './config/openapi.js';
import { configureSecurity } from './config/security.js';
import { UPLOAD_ROOT } from './config/upload.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();
configureSecurity(app);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
	res.json({
		service: 'swasti_natureal_api_server',
		type: 'REST API',
		apiBasePath: '/api/v1',
		documentation: '/api/docs',
		endpoints: {
			register: 'POST /api/v1/auth/register',
			login: 'POST /api/v1/auth/login',
			currentUser: 'GET /api/v1/auth/me',
			categories: '/api/v1/categories',
			products: '/api/v1/products',
			orders: '/api/v1/orders',
			customers: '/api/v1/customers',
			users: '/api/v1/users',
			dashboard: '/api/v1/dashboard/overview',
			reports: '/api/v1/reports/sales',
		},
	});
});

// Uploaded category/product/banner images. Cross-origin so a separately hosted client can display them.
app.use('/uploads', express.static(UPLOAD_ROOT, {
  fallthrough: true,
  index: false,
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/v1', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;