import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';
import type { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: Error & { status?: number; code?: string; meta?: { target?: string[] } },
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Handle JSON parsing errors from express.json()
  if (err instanceof SyntaxError && 'body' in err && err.status === 400) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body',
    });
    return;
  }

  // Handle Prisma known request errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const field = err.meta?.target ? ` on field: ${err.meta.target.join(', ')}` : '';
      res.status(409).json({
        success: false,
        message: `A record with this unique value already exists${field}`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record was not found',
      });
      return;
    }
  }

  // Operational errors (expected, safe to expose message)
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Unexpected / programming errors
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/** 404 handler — must be registered after all routes */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
