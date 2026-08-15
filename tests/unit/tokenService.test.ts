import { TokenService } from '@/services/token.service';
import { UnauthorizedError } from '@/utils/AppError';
import { Role } from '@prisma/client';

describe('TokenService', () => {
  it('signs and verifies access tokens', () => {
    const user = { id: 'user-123', email: 'test@example.com', role: Role.USER };
    const token = TokenService.signAccessToken(user);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const payload = TokenService.verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe(Role.USER);
  });

  it('throws UnauthorizedError on invalid token string', () => {
    expect(() => {
      TokenService.verifyAccessToken('invalid.jwt.token');
    }).toThrow(UnauthorizedError);
  });
});
