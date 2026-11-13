import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './env.js';

const allowedOrigins = new Set(env.corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean));

// In development, also allow localhost / 127.0.0.1 / private LAN addresses on any port
// (e.g. http://127.0.0.1:5173 or http://192.168.0.111:5173 from `vite --host`).
const DEV_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;
  return env.nodeEnv === 'development' && DEV_ORIGIN_PATTERN.test(origin);
}

function validateOrigin(origin, callback) {
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  const error = new Error('Origin is not allowed by CORS');
  error.statusCode = 403;
  callback(error);
}

export const httpCorsOptions = { origin: validateOrigin };

const isDevelopment = env.nodeEnv === 'development';

// Rate-limit responses use the same JSON shape as other API errors.
function limitHandler(message) {
  return (req, res, next, options) => {
    res.status(options.statusCode).json({ error: { message } });
  };
}

// General limit for every API call (including GET /auth/me on page refresh).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // The admin dashboard loads several widgets per page, so allow a realistic amount of traffic.
  limit: isDevelopment ? 3000 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler('Too many requests. Please wait a few minutes and try again.'),
});

// Brute-force protection for login/register only. Successful requests are not counted,
// so normal sign-ins never lock a user out — only repeated failures do.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevelopment ? 100 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler('Too many failed sign-in attempts. Please wait 15 minutes and try again.'),
});

// Spam protection for public forms (contact, newsletter). Counts every request.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevelopment ? 100 : 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler('Too many submissions. Please try again in a few minutes.'),
});

export function configureSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy ? 1 : false);
  app.use(helmet());
  app.use(cors(httpCorsOptions));
  app.use('/api', apiLimiter);
  app.use(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'], credentialLimiter);
  app.use(['/api/v1/store/contact', '/api/v1/store/newsletter'], formLimiter);
}