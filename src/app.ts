import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from '@/config/env';
import passport from '@/config/passport';
import morganMiddleware from '@/config/morgan';
import { metricsMiddleware } from '@/middleware/metricsMiddleware';
import { apiLimiter } from '@/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

import apiRoutes from '@/routes/index';
import metricsRoutes from '@/routes/metrics.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ─── Body Parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(compression());

  // ─── Logging ────────────────────────────────────────────────────────────────
  app.use(morganMiddleware);

  // ─── Metrics ────────────────────────────────────────────────────────────────
  app.use(metricsMiddleware);

  // ─── Auth ───────────────────────────────────────────────────────────────────
  app.use(passport.initialize());

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  app.use(env.API_PREFIX, apiLimiter);

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.use(env.API_PREFIX, apiRoutes);
  app.use('/metrics', metricsRoutes); // Prometheus scrape endpoint

  // ─── Error Handling ─────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
