import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { effectiveRole, hasPermission, VIEW_AS_ROLES } from '../config/roles.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Authentication required', 401);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError('Account is unavailable', 401);
  // Optional "view as" mode: a super admin can act as a lower role (e.g. admin) for this request.
  const viewAs = req.get('x-view-as')?.trim().toLowerCase();
  if (viewAs && viewAs !== user.role) {
    if (!VIEW_AS_ROLES[user.role]?.includes(viewAs)) throw new AppError('You cannot switch to that role', 403);
    user.$locals.viewAs = viewAs;
  }
  req.user = user;
  next();
});

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(effectiveRole(req.user))) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}