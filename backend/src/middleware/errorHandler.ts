import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  /** Express error-handling middleware (4-arg signature). Logs the full error with stack trace
   *  in all environments. In production, 500-level errors return a generic message to prevent
   *  leaking internals. Operational errors (created via createHttpError) pass through their
   *  status code and message directly. */
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${statusCode} — ${err.message}`, {
    stack: err.stack,
    isOperational: err.isOperational,
  });

  res.status(statusCode).json({
    error: isProduction && statusCode === 500
      ? 'Internal server error'
      : err.message,
  });
}

export function createHttpError(statusCode: number, message: string): AppError {
  /** Factory that creates an Error with an HTTP statusCode and isOperational flag.
   *  Operational errors are expected failures (bad input, auth failures) whose
   *  message is safe to return to the client. */
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  /** Wraps an async route handler so that any thrown or rejected error is automatically
   *  forwarded to Express's next(err) instead of causing an unhandled promise rejection. */
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
