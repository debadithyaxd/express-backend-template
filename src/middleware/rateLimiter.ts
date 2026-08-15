import { env } from '@/config/env';
import { redis } from '@/config/redis';
import rateLimit, { type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

const makeStore = (): Store | undefined => {
  if (env.NODE_ENV === 'test') {
    return undefined; // Use in-memory store during tests
  }
  return new RedisStore({
    // @ts-expect-error ioredis call signature compatibility with rate-limit-redis
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
    prefix: 'rl:',
  });
};

/** General API rate limiter */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore(),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/** Stricter limiter for auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore(),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});
