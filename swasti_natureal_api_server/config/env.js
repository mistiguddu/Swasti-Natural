import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*(s|m|h|d|w|y)$/, 'Use a duration such as 15m or 1h').default('1h'),
  CORS_ORIGINS: z.string().default(''),
  // Which proxies may set X-Forwarded-For: 'loopback' (the Next.js web client on this machine, default),
  // 'true' (one hop, e.g. nginx), a hop count, an IP/subnet list, or 'false' (none).
  TRUST_PROXY: z.string().trim().min(1).default('loopback'),
  SUPERADMIN_NAME: z.string().trim().min(2).max(80).default('Super Administrator'),
  SUPERADMIN_EMAIL: z.string().trim().email().default('superadmin@gmail.com'),
  SUPERADMIN_PASSWORD: z.string().max(128).optional(),
  ADMIN_NAME: z.string().trim().min(2).max(80).default('Administrator'),
  ADMIN_EMAIL: z.string().trim().email().default('admin@gmail.com'),
  ADMIN_PASSWORD: z.string().max(128).optional(),
  // Customer website URL (used in password-reset links)
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  // Optional SMTP for transactional email (password reset). Without it, links are logged in development.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

/** Express 'trust proxy' value from TRUST_PROXY. */
function parseTrustProxy(value) {
  if (value === 'false') return false;
  if (value === 'true') return 1;
  if (/^\d+$/.test(value)) return Number(value);
  return value; // 'loopback', 'uniquelocal', '10.0.0.1', '10.0.0.0/8, 127.0.0.1' …
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  mongodbUri: parsed.data.MONGODB_URI,
  mongodbDatabase: parsed.data.MONGODB_DATABASE,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  corsOrigins: parsed.data.CORS_ORIGINS,
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
  clientUrl: parsed.data.CLIENT_URL.replace(/\/$/, ''),
  smtp: parsed.data.SMTP_HOST ? {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    secure: parsed.data.SMTP_SECURE === 'true',
    auth: parsed.data.SMTP_USER ? { user: parsed.data.SMTP_USER, pass: parsed.data.SMTP_PASS } : undefined,
    from: parsed.data.SMTP_FROM || parsed.data.SMTP_USER,
  } : null,
  // Accounts seeded automatically on startup (created only if the email does not exist yet).
  initialAccounts: [
    {
      role: 'superadmin',
      name: parsed.data.SUPERADMIN_NAME,
      email: parsed.data.SUPERADMIN_EMAIL,
      password: parsed.data.SUPERADMIN_PASSWORD,
    },
    {
      role: 'admin',
      name: parsed.data.ADMIN_NAME,
      email: parsed.data.ADMIN_EMAIL,
      password: parsed.data.ADMIN_PASSWORD,
    },
  ],
};