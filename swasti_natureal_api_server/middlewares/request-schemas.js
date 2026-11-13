import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    phone: z.string().trim().max(30).optional().default(''),
  }),
});

export const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().trim().email().max(254) }) });
export const resetPasswordSchema = z.object({ body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid reset link'), password: z.string().min(8).max(128) }) });

export const loginSchema = z.object({
  body: z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }),
});
