import { Request, Response, NextFunction } from 'express';
import {
  httpRequestCounter,
  httpRequestDuration,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
} from '@/config/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  // Track request size
  const reqSize = parseInt(req.headers['content-length'] ?? '0', 10);

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1e9;

    // Normalize route (use matched route pattern, not raw path)
    const route = req.route?.path
      ? `${req.baseUrl ?? ''}${req.route.path}`
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

    const resSize = parseInt(res.getHeader('content-length') as string ?? '0', 10);
    if (resSize > 0) {
      httpResponseSizeBytes.observe({ method: req.method, route }, resSize);
    }
  });

  next();
};
