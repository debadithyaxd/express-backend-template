import {
  httpRequestCounter,
  httpRequestDuration,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
} from '@/config/metrics';
import type { NextFunction, Request, Response } from 'express';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  // Track request size
  const reqSize = Number.parseInt(req.headers['content-length'] ?? '0', 10);

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1e9;

    // Normalize route (use matched route pattern, avoid high-cardinality for unmatched paths)
    const route = req.route?.path
      ? `${req.baseUrl ?? ''}${req.route.path}`
      : res.statusCode === 404
        ? 'unmatched'
        : req.path;

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestCounter.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);

    if (reqSize > 0) {
      httpRequestSizeBytes.observe({ method: req.method, route }, reqSize);
    }

    const rawResSize = res.getHeader('content-length');
    const resSize = rawResSize ? Number.parseInt(String(rawResSize), 10) : 0;
    if (resSize > 0) {
      httpResponseSizeBytes.observe({ method: req.method, route }, resSize);
    }
  });

  next();
};
