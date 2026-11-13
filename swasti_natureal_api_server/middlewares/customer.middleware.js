import AppError from '../utils/AppError.js';

/** Allows only customer accounts (role `user`). Staff use the admin console instead. */
export function requireCustomer(req, res, next) {
  if (req.user?.role !== 'user') {
    next(new AppError('This area is for customer accounts. Please sign in with a customer account.', 403));
    return;
  }
  next();
}
