import { discardRequestFiles } from '../services/file.service.js';

export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
  LIMIT_FILE_COUNT: 'Too many files uploaded',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field or too many images',
};

function describe(error) {
  if (error.name === 'MulterError') return { statusCode: 400, message: MULTER_MESSAGES[error.code] ?? error.message };
  if (error.name === 'ValidationError' && error.errors) {
    return {
      statusCode: 400,
      message: 'Request validation failed',
      details: Object.values(error.errors).map((issue) => ({ path: issue.path, message: issue.message })),
    };
  }
  if (error.name === 'CastError') return { statusCode: 400, message: `Invalid ${error.path}` };
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0];
    return { statusCode: 409, message: field ? `A record with that ${field} already exists` : 'A record with that value already exists' };
  }
  const statusCode = error.statusCode ?? (error.type === 'entity.too.large' ? 413 : (error instanceof SyntaxError && 'body' in error ? 400 : 500));
  return { statusCode, message: statusCode >= 500 ? 'Internal server error' : error.message, details: error.details };
}

export async function errorHandler(error, req, res, next) {
  // Files uploaded with a request that failed are orphans: remove them.
  await discardRequestFiles(req);
  const { statusCode, message, details } = describe(error);
  if (statusCode >= 500) console.error(error);
  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
  });
}
