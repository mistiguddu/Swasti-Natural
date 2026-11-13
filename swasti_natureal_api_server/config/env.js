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
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  SUPERADMIN_NAME: z.string().trim().min(2).max(80).default('Super Administrator'),
  SUPERADMIN_EMAIL: z.string().trim().email().default('superadmin@gmail.com'),
  SUPERADMIN_PASSWORD: z.string().max(128).optional(),
  ADMIN_NAME: z.string().trim().min(2).max(80).default('Administrator'),
  ADMIN_EMAIL: z.string().trim().email().default('admin@gmail.com'),
  ADMIN_PASSWORD: z.string().max(128).optional(),
});

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
  trustProxy: parsed.data.TRUST_PROXY === 'true',
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