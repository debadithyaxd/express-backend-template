import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { TokenPair } from '@/types';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendCreated } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  const { user, tokens } = await AuthService.register(name, email, password);
  sendCreated(res, { user, tokens }, 'Account created successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const meta = {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
  const { user, tokens } = await AuthService.login(email, password, meta);
  sendSuccess(res, { user, tokens }, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const meta = {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
  const tokens: TokenPair = await AuthService.refresh(refreshToken, meta);
  sendSuccess(res, { tokens }, 'Tokens refreshed successfully');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  await AuthService.logout(refreshToken);
  sendSuccess(res, null, 'Logged out successfully');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  const { id } = (req as AuthenticatedRequest).user;
  await AuthService.logoutAll(id);
  sendSuccess(res, null, 'Logged out from all devices');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { id } = (req as AuthenticatedRequest).user;
  const user = await AuthService.getMe(id);
  sendSuccess(res, { user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { id } = (req as AuthenticatedRequest).user;
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  await AuthService.changePassword(id, currentPassword, newPassword);
  sendSuccess(res, null, 'Password changed successfully. Please log in again.');
});

/** Called after Google OAuth2 callback succeeds */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  // req.user is set by Passport Google strategy (contains { user, tokens })
  const { tokens } = req.user as unknown as { tokens: TokenPair };
  // In a real app you'd redirect to your frontend with tokens in query/cookie
  sendSuccess(res, { tokens }, 'Google login successful');
});
