import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@/utils/AppError';

describe('AppError', () => {
  it('should create an AppError with correct properties', () => {
    const err = new AppError('Something went wrong', 500);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it('BadRequestError should have statusCode 400', () => {
    const err = new BadRequestError('Bad input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad input');
  });

  it('UnauthorizedError should have statusCode 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('ForbiddenError should have statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError should have statusCode 404', () => {
    const err = new NotFoundError('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('ConflictError should have statusCode 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });
});
