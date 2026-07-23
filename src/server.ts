import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './utils/logger';

const app = createApp();

async function bootstrap(): Promise<void> {
  try {
    // Connect to Postgres
    await connectDB();
    logger.info('PostgreSQL connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`📊 Metrics available at http://localhost:${env.PORT}/metrics`);
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        logger.info('Database disconnected');
        await disconnectRedis();
        logger.info('Redis disconnected');
        process.exit(0);
      });

      // Force kill after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason });
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

void bootstrap();
