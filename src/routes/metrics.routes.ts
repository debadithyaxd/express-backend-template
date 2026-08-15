import { env } from '@/config/env';
import { register } from '@/config/metrics';
import { type Request, type Response, Router } from 'express';

const router = Router();

/**
 * GET /metrics
 * Exposes Prometheus metrics. In production, protect this behind IP allowlist
 * or a separate internal port — never expose publicly.
 */
router.get('/', async (_req: Request, res: Response) => {
  if (env.NODE_ENV === 'production') {
    // Add your internal IP check here, e.g., req.ip === '10.0.0.1'
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
