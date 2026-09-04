export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'درخواست نامعتبر است', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'احراز هویت انجام نشده است', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'منبع مورد نظر یافت نشد', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}
