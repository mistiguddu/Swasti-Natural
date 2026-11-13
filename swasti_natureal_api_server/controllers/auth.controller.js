import * as authService from '../auth.service.js';
import { ROLE_DEFINITIONS } from '../config/roles.js';

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json({ data: result });
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.status(200).json({ data: result });
}

export async function getCurrentUser(req, res) {
  res.json({ data: { user: req.user, permissions: ROLE_DEFINITIONS[req.user.role]?.permissions ?? [] } });
}

export async function updateProfile(req, res) {
  const user = await authService.updateProfile(req.user, req.validated.body);
  res.json({ data: { user } });
}

export async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.validated.body);
  res.json({ data: { message: 'Password updated' } });
}

export async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.validated.body.email);
  res.json({ data: { message: 'If an account exists for that email, a reset link has been sent.', ...result } });
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.validated.body);
  res.json({ data: { message: 'Password updated. You can now sign in.' } });
}
