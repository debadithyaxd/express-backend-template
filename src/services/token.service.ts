import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { JwtPayload, JwtRefreshPayload, TokenPair } from '../types';
import { Role } from '@prisma/client';
import { UnauthorizedError } from '../utils/AppError';

export class TokenService {
  /**
   * Sign a short-lived access token.
   */
  static signAccessToken(payload: { id: string; email: string; role: Role }): string {
    return jwt.sign(
      { sub: payload.id, email: payload.email, role: payload.role } as JwtPayload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );
  }

  /**
   * Sign a long-lived refresh token and persist it to the DB.
   */
  static async createRefreshToken(
    userId: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<string> {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));

    const token = jwt.sign(
      { sub: userId, tokenId } as JwtRefreshPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        token,
        userId,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return token;
  }

  /**
   * Issue both access + refresh tokens.
   */
  static async issueTokenPair(
    user: { id: string; email: string; role: Role },
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      TokenService.signAccessToken(user),
      TokenService.createRefreshToken(user.id, meta),
    ]);
    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode an access token.
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  /**
   * Verify a refresh token, check DB record, rotate it (revoke old, issue new).
   */
  static async rotateRefreshToken(
    incomingToken: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    let payload: JwtRefreshPayload;
    try {
      payload = jwt.verify(incomingToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const record = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      // Possible token reuse — revoke all tokens for this user (security measure)
      if (record) {
        await prisma.refreshToken.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedError('Refresh token has been revoked or expired');
    }

    // Revoke the used token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: record.userId } });

    return TokenService.issueTokenPair(user, meta);
  }

  /**
   * Revoke a single refresh token.
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke ALL refresh tokens for a user (logout everywhere).
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

/** Parse duration strings like "15m", "7d" into milliseconds */
function ms(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  const map: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (map[unit] ?? 1_000);
}
