import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import Redis from 'ioredis';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) {
      logger.error('Redis: max retries reached, giving up');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis: connected'));
redis.on('ready', () => logger.info('Redis: ready'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('close', () => logger.warn('Redis: connection closed'));
redis.on('reconnecting', () => logger.info('Redis: reconnecting...'));

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready' || redis.status === 'connect') {
    return;
  }
  if (redis.status === 'wait') {
    await redis.connect();
    return;
  }
  // If already connecting or reconnecting, ping to ensure readiness
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status !== 'end' && redis.status !== 'close') {
    await redis.quit();
  }
}
