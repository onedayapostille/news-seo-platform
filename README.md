# News SEO Platform

Full-stack monorepo: React + Vite frontend, Express + Prisma backend, PostgreSQL database.

## File Tree

```
news-seo-platform/
├── package.json               # npm workspaces root
├── tsconfig.base.json         # shared TS config
├── docker-compose.yml         # postgres + backend + frontend
├── .env.example               # environment template
├── .gitignore
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts           # Express app entry
│       ├── prisma.ts          # Prisma client singleton
│       ├── config/
│       │   └── env.ts         # centralized env config
│       ├── routes/
│       │   ├── index.ts       # route aggregator
│       │   └── health.ts      # GET /health
│       ├── services/
│       │   └── health.ts      # health check logic
│       ├── modules/           # feature modules (future)
│       └── middleware/
│           └── errorHandler.ts
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── Dockerfile             # multi-stage (build → nginx)
    ├── .dockerignore
    ├── nginx.conf
    └── src/
        ├── main.tsx
        ├── App.tsx            # health check UI
        ├── api/
        │   └── health.ts     # API client for /api/health
        ├── index.css
        └── vite-env.d.ts
```

## Prerequisites

- Node.js >= 18
- PostgreSQL 14+ (or Docker)
- npm >= 9

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work with local PostgreSQL)
```

### 3. Start PostgreSQL

Either start your local PostgreSQL, or use Docker:

```bash
docker compose up postgres -d
```

### 4. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

### 5. Start development servers

In separate terminals:

```bash
# Backend (port 4000)
npm run dev:backend

# Frontend (port 5173)
npm run dev:frontend
```

The frontend dev server proxies `/api` requests to the backend automatically.

### 6. Verify

Open http://localhost:5173 — you should see the health check page with both "Backend" and "Database" showing green "ok" badges.

Or test the API directly:

```bash
curl http://localhost:4000/api/health
# {"status":"ok","db":"ok"}
```

## Docker (Production)

### 1. Set up environment

```bash
cp .env.example .env
```

### 2. Build and start all services

```bash
docker compose up --build -d
```

This starts:
- **postgres** on port 5432
- **backend** on port 4000 (runs `prisma migrate deploy` on startup)
- **frontend** on port 3000 (nginx serves built assets, proxies `/api` to backend)

### 3. Verify

```bash
# Health check
curl http://localhost:4000/api/health

# Frontend
open http://localhost:3000
```

### 4. Stop

```bash
docker compose down
# To also remove the database volume:
docker compose down -v
```

## Verification Checklist

- [ ] `npm install` at root installs both workspaces
- [ ] `npm run dev:backend` starts Express on port 4000
- [ ] `npm run dev:frontend` starts Vite on port 5173
- [ ] `GET /api/health` returns `{"status":"ok","db":"ok"}`
- [ ] Frontend displays backend and database status
- [ ] `docker compose up --build` starts all 3 services
- [ ] Backend healthcheck passes in Docker
- [ ] Frontend at port 3000 proxies `/api` to backend
- [ ] CORS origins configurable via `CORS_ORIGINS` env var
- [ ] Rate limiting active (100 req / 15 min window)
- [ ] Helmet security headers present
- [ ] Prisma migrations run on production start
