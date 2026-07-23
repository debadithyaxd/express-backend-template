import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { AuthProvider } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { AuthService } from '@/services/auth.service';
import { JwtPayload } from '@/types';

// ─── JWT Strategy ─────────────────────────────────────────────────────────────
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_ACCESS_SECRET,
    },
    async (payload: JwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) return done(null, false);
        return done(null, { id: user.id, email: user.email, role: user.role });
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

// ─── Google OAuth2 Strategy ───────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Google'), false);

        const { user, tokens } = await AuthService.oauthUpsert({
          providerId: profile.id,
          provider: AuthProvider.GOOGLE,
          email,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });

        // Pass both user and tokens through to the callback
        return done(null, { user, tokens } as unknown as Express.User);
      } catch (err) {
        return done(err as Error, false);
      }
    },
  ),
);

export default passport;
