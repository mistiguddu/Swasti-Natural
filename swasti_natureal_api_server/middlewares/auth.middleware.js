import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { effectiveRole, hasPermission, isReadOnly, VIEW_AS_ROLES } from '../config/roles.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Writes a read-only admin may still make: marking their own notifications as read. */
const READ_ONLY_ALLOWED = [/^\/api\/v\d+\/notifications(\/|$)/];

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
    // Read-only admins can view everything their role allows, but every change is refused here,
    // on the server, whatever the client does.
    if (isReadOnly(req.user) && !SAFE_METHODS.has(req.method) && !READ_ONLY_ALLOWED.some((rule) => rule.test(req.originalUrl))) {
      next(new AppError('Your account is read-only. You can view the dashboard but cannot make changes.', 403, { code: 'READ_ONLY' }));
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