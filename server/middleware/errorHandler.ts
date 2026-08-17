import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { env } from '../env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.id || (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : 'unknown-request-id');

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message || 'خطای اعتبارسنجی داده‌ها';
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message,
        requestId,
        details: err.issues,
      },
      message,
      details: err.issues,
    });
  }

  // Handle Custom Domain/App Errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {}),
      },
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Handle SyntaxError from invalid JSON body
  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    const message = 'فرمت JSON ارسالی نامعتبر است';
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'INVALID_JSON',
        message,
        requestId,
      },
      message,
    });
  }

  // Log internal unexpected errors
  const isProduction = env.NODE_ENV === 'production';
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : (typeof err.status === 'number' ? err.status : 500);
  const code = err.code && typeof err.code === 'string' ? err.code : (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = isProduction && statusCode === 500
    ? 'خطای داخلی سرور رخ داده است'
    : (err.message || 'خطای سرور');

  if (statusCode >= 500) {
    req.log?.error?.({ err, requestId }, 'Unhandled Server Error');
  }

  res.status(statusCode).json({
    status: 'error',
    error: {
      code,
      message,
      requestId,
    },
    message,
  });
}
