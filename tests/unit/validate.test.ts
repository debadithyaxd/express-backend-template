import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate';

const schema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

const mockReq = (body: object): Partial<Request> => ({
  body,
  query: {},
  params: {},
});

const mockRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

const mockNext: NextFunction = jest.fn();

describe('validate middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next() when body is valid', async () => {
    const req = mockReq({ email: 'test@example.com', password: 'secret123' });
    const res = mockRes();
    await validate(schema)(req as Request, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('returns 422 when body is invalid', async () => {
    const req = mockReq({ email: 'not-an-email', password: '123' });
    const res = mockRes();
    await validate(schema)(req as Request, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Validation failed' }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
