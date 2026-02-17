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
# Backend (port 3001)
npm run dev:backend

# Frontend (port 5173)
npm run dev:frontend
```

The frontend dev server proxies `/api` requests to the backend automatically.

### 6. Verify

Open http://localhost:5173 — you should see the health check page with both "Backend" and "Database" showing green "ok" badges.

Or test the API directly:

```bash
curl http://localhost:3001/api/health
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
- **backend** on port 3001 (runs `prisma migrate deploy` on startup)
- **frontend** on port 3000 (nginx serves built assets, proxies `/api` to backend)

### 3. Verify

```bash
# Health check
curl http://localhost:3001/api/health

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
- [ ] `npm run dev:backend` starts Express on port 3001
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

## Phase 1 Verification

Phase 1 adds single-URL SEO analysis. After setup, verify with:

```bash
# 1. Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Site","domain":"example.com"}'

# 2. Analyze a URL (use the project id from step 1)
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","url":"https://example.com"}'

# 3. Retrieve a stored record
curl http://localhost:3001/api/url-records/<RECORD_ID>

# 4. Retrieve a crawl run summary
curl http://localhost:3001/api/crawl-runs/<CRAWL_RUN_ID>
```

Phase 1 Checklist:

- [ ] `POST /api/projects` creates a project
- [ ] `GET /api/projects` lists projects
- [ ] `POST /api/analyze-url` fetches, parses, and stores SEO signals
- [ ] Response includes statusCode, title, canonical, h1Count, wordCount, issues
- [ ] `GET /api/url-records/:id` returns stored record
- [ ] `GET /api/crawl-runs/:id` returns crawl run with records
- [ ] Frontend `/projects` page creates and lists projects
- [ ] Frontend `/analyze` page runs analysis and displays results
- [ ] Export JSON button downloads analysis as .json file

## Phase 2 Verification

Phase 2 adds a controlled site crawler. Test with:

```bash
# 1. Create project (if not already)
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Example","domain":"example.com"}'

# 2. Start crawl (use project id from step 1)
curl -X POST http://localhost:3001/api/crawls/start \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","startUrl":"https://example.com/","maxUrls":10,"maxDepth":1,"rateLimitMs":1000}'

# 3. Check crawl status (use crawlRunId from step 2)
curl http://localhost:3001/api/crawls/<CRAWL_RUN_ID>

# 4. List crawled URLs
curl "http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/urls?limit=50&offset=0"

# 5. Stop a running crawl
curl -X POST http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/stop
```

Phase 2 Checklist:

- [ ] `POST /api/crawls/start` creates and starts a BFS crawl
- [ ] Crawl enforces same-domain policy (rejects cross-domain startUrl)
- [ ] Crawl respects maxUrls, maxDepth, rateLimitMs
- [ ] Crawl skips non-HTML assets (images, pdf, css, js, etc.)
- [ ] `GET /api/crawls/:id` returns status, progress, and summary counts
- [ ] `GET /api/crawls/:id/urls` returns paginated URL records
- [ ] `POST /api/crawls/:id/stop` stops an active crawl
- [ ] Frontend `/crawler` page starts a crawl with configurable params
- [ ] Frontend `/crawls/:id` page shows live progress, summary, URL table
- [ ] Export JSON and Export CSV buttons work on completed crawls

## Phase 3 Verification

Phase 3 adds template clustering and a developer backlog engine. Test with:

```bash
# 1. Run a crawl first (Phase 2), then generate clusters from a completed crawl
curl -X POST http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/generate-clusters

# 2. List clusters for a crawl run
curl http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/clusters
```

Phase 3 Checklist:

- [ ] `POST /api/crawls/:id/generate-clusters` groups URL issues into clusters
- [ ] Clusters are grouped by templateGroup + section + issueCode
- [ ] Each cluster includes affectedCount, sampleUrls (up to 5), rootCauseHint, devFixSuggestion, validationSteps
- [ ] Deterministic mappings for all 8 issue codes (no AI)
- [ ] `GET /api/crawls/:id/clusters` returns clusters sorted by affectedCount desc
- [ ] Generation is idempotent (re-running replaces previous clusters)
- [ ] Frontend CrawlDetail has "Clusters" tab
- [ ] "Generate Clusters" button triggers cluster generation
- [ ] Cluster cards display issue code, template, section, affected count, sample URLs, dev fix steps
- [ ] "Export Clusters JSON" button downloads cluster data

## ARM64 Deployment Notes

All Docker images use multi-arch official base images that work on both x86_64 and ARM64:

- **Backend**: `node:20-bookworm-slim` (Debian glibc — reliable Prisma engine support on ARM64)
- **Frontend build**: `node:20-bookworm-slim`
- **Frontend serve**: `nginx:alpine`
- **Database**: `postgres:16-alpine`

### Building on an ARM64 server

```bash
# Build natively on the ARM64 host (preferred)
docker compose up --build -d
```

### Cross-building from x86_64 for ARM64

```bash
# Create a buildx builder (one time)
docker buildx create --use --name multiarch

# Build and load for ARM64
docker buildx bake --set '*.platform=linux/arm64' --load

# Or build individual services
docker buildx build --platform linux/arm64 -t news-seo-backend ./backend
docker buildx build --platform linux/arm64 -t news-seo-frontend ./frontend
```

Key points:
- No `--platform=linux/amd64` pinning exists in any Dockerfile
- Prisma generates the correct query engine binary for the host architecture at `npx prisma generate` time
- `bookworm-slim` (Debian 12) uses glibc, which avoids musl/Alpine compatibility issues with native Node.js modules on ARM64
