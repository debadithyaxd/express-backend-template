import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

/**
 * Requires a valid JWT access token.
 * Attaches decoded user to req.user.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: AuthenticatedRequest['user'] | false) => {
      if (err) return next(err);
      if (!user) return next(new UnauthorizedError('Authentication required'));
      (req as AuthenticatedRequest).user = user;
      next();
    },
  )(req, res, next);
};

/**
 * Requires the authenticated user to have one of the specified roles.
 * Must be used after `authenticate`.
 */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (!roles.includes(user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    next();
  };
