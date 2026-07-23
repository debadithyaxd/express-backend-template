import { sendSuccess, sendCreated, sendError } from '@/utils/apiResponse';

const mockRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
};

describe('apiResponse helpers', () => {
  it('sendSuccess returns 200 with success payload', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'OK', data: { id: 1 } });
  });

  it('sendCreated returns 201', () => {
    const res = mockRes();
    sendCreated(res, { id: 2 }, 'Created');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Created', data: { id: 2 } });
  });

  it('sendError returns given status code with error payload', () => {
    const res = mockRes();
    sendError(res, 'Not Found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not Found', errors: undefined });
  });
});
