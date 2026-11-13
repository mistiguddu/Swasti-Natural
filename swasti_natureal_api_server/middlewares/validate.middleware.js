import AppError from '../utils/AppError.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      next(new AppError('Request validation failed', 400, result.error.issues.map((issue) => ({
        path: issue.path.join('.'), message: issue.message,
      }))));
      return;
    }
    req.validated = result.data;
    next();
  };
}