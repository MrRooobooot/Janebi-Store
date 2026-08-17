import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const requestId = req.id || (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : 'unknown-request-id');
        const message = error.issues[0]?.message || 'خطای اعتبارسنجی';
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message,
            requestId,
            details: error.issues,
          },
          message,
          details: error.issues,
        });
      }
      return next(error);
    }
  };
