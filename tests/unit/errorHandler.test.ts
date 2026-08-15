import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { BadRequestError, NotFoundError } from '@/utils/AppError';
import type { NextFunction, Request, Response } from 'express';

const mockReq = (overrides = {}): Request =>
  ({
    path: '/test',
    method: 'GET',
    originalUrl: '/test',
    ...overrides,
  }) as unknown as Request;

const mockRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

const mockNext: NextFunction = jest.fn();

describe('errorHandler middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles AppError operational errors', () => {
    const err = new NotFoundError('Item not found');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Item not found',
    });
  });

  it('handles JSON body parser SyntaxError as 400', () => {
    const err = new SyntaxError('Unexpected token in JSON');
    Object.assign(err, { status: 400, body: '{ bad json' });
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Malformed JSON payload in request body',
    });
  });

  it('handles Prisma P2002 unique constraint error as 409', () => {
    const err = new Error('Unique constraint failed');
    Object.assign(err, {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: ['email'] },
    });
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'A record with this unique value already exists on field: email',
    });
  });

  it('handles Prisma P2025 not found error as 404', () => {
    const err = new Error('Record to update not found');
    Object.assign(err, {
      name: 'PrismaClientKnownRequestError',
      code: 'P2025',
    });
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'The requested record was not found',
    });
  });

  it('handles unexpected errors as 500', () => {
    const err = new Error('Database connection failed');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      }),
    );
  });
});

describe('notFoundHandler middleware', () => {
  it('returns 404 with route information', () => {
    const req = mockReq({ method: 'POST', originalUrl: '/unknown/endpoint' });
    const res = mockRes();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Route POST /unknown/endpoint not found',
    });
  });
});
