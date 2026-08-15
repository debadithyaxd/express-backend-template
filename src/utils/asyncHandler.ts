import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler and forwards any errors to Express error middleware.
 * Eliminates the need for try/catch in every controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
