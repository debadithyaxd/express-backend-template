import { createApp } from '@/app';
import { env } from '@/config/env';
import { connectDB, disconnectDB } from '@/config/prisma';
import { connectRedis, disconnectRedis } from '@/config/redis';
import { logger } from '@/utils/logger';

async function bootstrap(): Promise<void> {
  try {
    // Connect to Postgres
    await connectDB();
    logger.info('PostgreSQL connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`📊 Metrics available at http://localhost:${env.PORT}/metrics`);
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────────────
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received — shutting down gracefully`);

      // Force kill after 10s
      const timer = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
      timer.unref();

      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await disconnectDB();
          logger.info('Database disconnected');
        } catch (dbErr) {
          logger.error('Error disconnecting database', { error: (dbErr as Error).message });
        }
        try {
          await disconnectRedis();
          logger.info('Redis disconnected');
        } catch (redisErr) {
          logger.error('Error disconnecting Redis', { error: (redisErr as Error).message });
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      logger.error('Unhandled Rejection', { error: message, stack });
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

void bootstrap();
