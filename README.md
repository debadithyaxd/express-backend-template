# Express Backend Template

Production-ready Express + TypeScript backend with authentication, logging, metrics, and Docker support.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript 7 |
| Framework | Express 4 |
| Database | PostgreSQL + Prisma ORM 7 (`@prisma/adapter-pg`) |
| Cache / Rate limit | Redis + ioredis |
| Auth | JWT (access + refresh) + Google OAuth2 (Passport.js) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Metrics | Prometheus (prom-client) + Grafana |
| Linter & Formatter | Biome |
| Testing | Jest + SWC + Supertest |
| Containerisation | Docker (multi-stage) + docker-compose |

---

## Project Structure

```
src/
├── config/         # env, prisma, redis, passport, morgan, metrics
├── controllers/    # request/response handlers
├── middleware/     # authenticate, validate, rateLimiter, errorHandler, metricsMiddleware
├── routes/         # auth, health, metrics
├── services/       # auth.service, token.service
├── types/          # shared TypeScript interfaces
├── utils/          # AppError, asyncHandler, apiResponse, logger
├── validators/     # Zod schemas
├── app.ts          # Express app factory
└── server.ts       # Entry point + graceful shutdown
prisma/
├── schema.prisma   # User + RefreshToken models
└── seed.ts         # Admin seed
monitoring/
├── prometheus.yml
└── grafana/        # Auto-provisioned datasource + dashboard
tests/
├── unit/           # AppError, validate, asyncHandler, apiResponse, errorHandler, tokenService
└── integration/    # Full auth flow via Supertest
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT secrets, Google OAuth credentials
```

### 3. Run database migrations
```bash
npm run prisma:migrate
npm run prisma:seed      # creates admin@example.com / Admin@123456
```

### 4. Start dev server
```bash
npm run dev
```

---

## Docker (Full Stack)

Starts the app, PostgreSQL, Redis, Prometheus, and Grafana in one command.

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / admin) |

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register with email + password |
| POST | `/login` | — | Login, get token pair |
| POST | `/refresh` | — | Rotate refresh token |
| POST | `/logout` | — | Revoke refresh token |
| POST | `/logout-all` | JWT | Revoke all sessions |
| GET | `/me` | JWT | Get current user |
| PATCH | `/change-password` | JWT | Change password |
| GET | `/google` | — | Initiate Google OAuth2 |
| GET | `/google/callback` | — | Google OAuth2 callback |

### Health — `/api/v1/health`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Liveness check |
| GET | `/ready` | Readiness check (DB + Redis) |

### Metrics — `/metrics`
Prometheus scrape endpoint.

---

## Scripts

```bash
npm run dev               # Start TypeScript compiler in watch mode
npm run build             # Compile TypeScript 7 + resolve module aliases
npm start                 # Run compiled output (dist/server.js)
npm test                  # Run tests with Jest + SWC
npm run test:coverage     # Run tests with coverage report
npm run lint              # Biome linting
npm run format            # Biome formatting
npm run check             # Biome lint + format check & fix
npm run prisma:migrate    # Run DB migrations (dev)
npm run prisma:migrate:prod # Run DB migrations (prod)
npm run prisma:studio     # Open Prisma Studio
npm run prisma:seed       # Seed database (Admin user)
```

---

## Environment Variables

See `.env.example` for all variables with descriptions. All are validated at startup via Zod — the server will refuse to start if any required variable is missing or malformed.

---

## Auth Flow

```
Register / Login  →  accessToken (15m)  +  refreshToken (7d, stored in DB)
Authenticated requests  →  Bearer <accessToken>
Token expiry  →  POST /auth/refresh  →  new token pair (old refresh token revoked)
Logout  →  refresh token revoked in DB
Token reuse detected  →  ALL user sessions revoked automatically
```
