import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';

const mockReq = {} as Request;
const mockRes = {} as Response;
const mockNext = jest.fn() as NextFunction;

describe('asyncHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the handler and resolves without error', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    await asyncHandler(handler)(mockReq, mockRes, mockNext);
    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('forwards errors to next()', async () => {
    const error = new Error('boom');
    const handler = jest.fn().mockRejectedValue(error);
    await asyncHandler(handler)(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
