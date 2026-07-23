import bcrypt from 'bcryptjs';
import { prisma } from '@/config/prisma';
import { env } from '@/config/env';
import { TokenService } from '@/services/token.service';
import { TokenPair } from '@/types';
import { AuthProvider, Role } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@/utils/AppError';
import { authLoginCounter } from '@/config/metrics';

export class AuthService {
  // ─── Register ───────────────────────────────────────────────────────────────

  static async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('An account with this email already exists');

    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, provider: AuthProvider.LOCAL },
    });

    const tokens = await TokenService.issueTokenPair(user);

    authLoginCounter.inc({ provider: 'local', success: 'true' });

    return { user: toSafeUser(user), tokens };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  static async login(
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      authLoginCounter.inc({ provider: 'local', success: 'false' });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      authLoginCounter.inc({ provider: 'local', success: 'false' });
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await TokenService.issueTokenPair(user, meta);
    authLoginCounter.inc({ provider: 'local', success: 'true' });

    return { user: toSafeUser(user), tokens };
  }

  // ─── OAuth Upsert ───────────────────────────────────────────────────────────

  static async oauthUpsert(profile: {
    providerId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<{ user: SafeUser; tokens: TokenPair }> {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { providerId: profile.providerId, provider: profile.provider },
          { email: profile.email },
        ],
      },
    });

    if (user) {
      // Update OAuth info if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          providerId: profile.providerId,
          provider: profile.provider,
          avatarUrl: profile.avatarUrl ?? user.avatarUrl,
          isVerified: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          provider: profile.provider,
          providerId: profile.providerId,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
        },
      });
    }

    const tokens = await TokenService.issueTokenPair(user);
    authLoginCounter.inc({ provider: profile.provider.toLowerCase(), success: 'true' });

    return { user: toSafeUser(user), tokens };
  }

  // ─── Refresh ────────────────────────────────────────────────────────────────

  static async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    return TokenService.rotateRefreshToken(refreshToken, meta);
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  static async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeRefreshToken(refreshToken);
  }

  static async logoutAll(userId: string): Promise<void> {
    await TokenService.revokeAllUserTokens(userId);
  }

  // ─── Change Password ────────────────────────────────────────────────────────

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (!user.password) throw new BadRequestError('Cannot change password for OAuth accounts');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    // Revoke all refresh tokens to force re-login everywhere
    await TokenService.revokeAllUserTokens(userId);
  }

  // ─── Get Me ─────────────────────────────────────────────────────────────────

  static async getMe(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    return toSafeUser(user);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: AuthProvider;
  isVerified: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}

function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: AuthProvider;
  isVerified: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    provider: user.provider,
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
