import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

// ─── HTTP Metrics  ───

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestSizeBytes = new Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1_000, 5_000, 10_000, 50_000, 100_000],
  registers: [register],
});

export const httpResponseSizeBytes = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1_000, 5_000, 10_000, 50_000, 100_000],
  registers: [register],
});

// ─── Auth Metrics  ──

export const authLoginCounter = new Counter({
  name: 'auth_logins_total',
  help: 'Total number of login attempts',
  labelNames: ['provider', 'success'],
  registers: [register],
});

export const authTokenRefreshCounter = new Counter({
  name: 'auth_token_refreshes_total',
  help: 'Total number of token refresh attempts',
  labelNames: ['success'],
  registers: [register],
});

// ─── Active Users  ──

export const activeUsersGauge = new Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users (with valid sessions)',
  registers: [register],
});
