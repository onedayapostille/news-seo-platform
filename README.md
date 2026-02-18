# News SEO Platform

Full-stack monorepo for news website SEO auditing: React + Vite frontend, Express + Prisma backend, PostgreSQL database.

---

## Project Summary

A complete SEO analysis platform built from scratch as a monorepo. It allows users to create projects, analyze individual URLs for SEO issues, crawl entire websites with BFS, and generate developer-friendly issue clusters for fixing problems at scale.

### What Was Built (Full History)

| Phase | Description | Commit |
|-------|-------------|--------|
| **Scaffold** | Monorepo with npm workspaces, Express backend, React frontend, Docker Compose, PostgreSQL | `21e8882` |
| **Refactor** | Modularized backend (routes, services, config, middleware) and frontend (pages, api) | `843fba3` |
| **Phase 1** | Single URL SEO analyzer — fetches a URL, parses HTML, extracts SEO signals (title, canonical, h1, word count, meta), detects issues | `0543ec0` |
| **Phase 2** | Controlled site crawler — BFS crawl with same-domain policy, max depth/URLs, rate limiting, live progress, stop/resume | `89b3fe2` |
| **Phase 3** | Template clustering + developer backlog engine — groups issues by template/section/code, generates root cause hints and fix suggestions | `cce88fb` |
| **Docker fixes** | ARM64 support (bookworm-slim), multi-stage builds, port configuration, security hardening (Helmet, CORS, rate limiting) | `cce88fb` → `3752e1c` → `bd934fc` |
| **Dublyo deploy** | Root Dockerfile for Dublyo platform, build fixes (tsc, prisma generate, lockfile context) | `f974c87` → `88adef0` |
| **Prisma migration** | Initial migration with SSL support for external PostgreSQL database | `7414f7a` |
| **DB check endpoint** | `GET /db-check` and `GET /api/db-check` for verifying database connectivity | `2655358` → `cd8ed01` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, React Router |
| **Backend** | Express 4, TypeScript, Node.js 20 |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma (with migrations) |
| **Containers** | Docker, Docker Compose |
| **Deployment** | Dublyo (hosted) |

---

## File Tree

```
news-seo-platform/
├── package.json               # npm workspaces root
├── tsconfig.base.json         # shared TS config
├── docker-compose.yml         # postgres + backend + frontend
├── Dockerfile                 # root Dockerfile for Dublyo deployment
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma      # DB models: Project, CrawlRun, UrlRecord, IssueCluster
│   │   └── migrations/        # PostgreSQL migrations
│   └── src/
│       ├── index.ts           # Express app entry (port 3000/3001)
│       ├── prisma.ts          # Prisma client singleton
│       ├── config/
│       │   └── env.ts         # centralized env config
│       ├── routes/
│       │   ├── index.ts       # route aggregator
│       │   ├── health.ts      # GET /health, GET /db-check
│       │   ├── projects.ts    # CRUD /api/projects
│       │   ├── analyzeUrl.ts  # POST /api/analyze-url
│       │   ├── crawls.ts      # POST /api/crawls/start, GET/stop crawls
│       │   ├── crawlRuns.ts   # GET /api/crawl-runs/:id
│       │   ├── urlRecords.ts  # GET /api/url-records/:id
│       │   └── clusters.ts   # POST generate-clusters, GET clusters
│       ├── services/
│       │   ├── health.ts          # health check logic
│       │   ├── httpFetch.ts       # HTTP fetcher with timeouts
│       │   ├── htmlParse.ts       # HTML parser (title, meta, h1, word count)
│       │   ├── issueEngine.ts     # SEO issue detection (8 issue codes)
│       │   ├── urlNormalize.ts    # URL normalization
│       │   ├── templateDetect.ts  # URL → template group detection
│       │   ├── linkExtract.ts     # Internal/external link extraction
│       │   └── domainPolicy.ts    # Same-domain enforcement for crawls
│       └── middleware/
│           └── errorHandler.ts
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── Dockerfile             # multi-stage (build → nginx)
    ├── nginx.conf
    └── src/
        ├── main.tsx
        ├── App.tsx            # router with navigation
        ├── api/
        │   └── health.ts     # API client
        ├── pages/
        │   ├── Projects.tsx   # project management UI
        │   ├── Analyze.tsx    # single URL analysis UI
        │   ├── Crawler.tsx    # crawl launcher UI
        │   └── CrawlDetail.tsx # crawl progress + clusters UI
        ├── index.css
        └── vite-env.d.ts
```

---

## Database Schema

Four models managed by Prisma:

- **Project** — `id`, `name`, `domain`, `createdAt`
- **CrawlRun** — `id`, `projectId`, `status`, `startUrl`, `maxUrls`, `maxDepth`, `startedAt`, `finishedAt`, `progressJson`
- **UrlRecord** — `id`, `crawlRunId`, `url`, `normalizedUrl`, `section`, `templateGroup`, `statusCode`, `canonical`, `robotsMeta`, `title`, `metaDescription`, `h1Count`, `wordCount`, `internalLinksCount`, `externalLinksCount`, `issuesJson`, `analyzedAt`
- **IssueCluster** — `id`, `crawlRunId`, `templateGroup`, `section`, `issueCode`, `affectedCount`, `sampleUrlsJson`, `rootCauseHint`, `devFixSuggestion`, `validationSteps`, `createdAt`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Backend health check |
| `GET` | `/db-check` | Database connectivity check |
| `GET` | `/api/health` | Health + DB status |
| `GET` | `/api/db-check` | Database connectivity check |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/analyze-url` | Analyze a single URL for SEO issues |
| `GET` | `/api/url-records/:id` | Get a stored URL record |
| `GET` | `/api/crawl-runs/:id` | Get a crawl run with records |
| `POST` | `/api/crawls/start` | Start a BFS crawl |
| `GET` | `/api/crawls/:id` | Get crawl status and progress |
| `GET` | `/api/crawls/:id/urls` | List crawled URLs (paginated) |
| `POST` | `/api/crawls/:id/stop` | Stop a running crawl |
| `POST` | `/api/crawls/:id/generate-clusters` | Generate issue clusters from crawl results |
| `GET` | `/api/crawls/:id/clusters` | List issue clusters |

---

## SEO Issue Codes

The issue engine detects 8 issue types:

1. **MISSING_TITLE** — Page has no `<title>` tag
2. **TITLE_TOO_LONG** — Title exceeds 60 characters
3. **MISSING_META_DESC** — No meta description
4. **META_DESC_TOO_LONG** — Meta description exceeds 160 characters
5. **MISSING_H1** — No `<h1>` tag found
6. **MULTIPLE_H1** — More than one `<h1>` tag
7. **MISSING_CANONICAL** — No canonical link
8. **THIN_CONTENT** — Word count below 300

---

## Deployment on Dublyo

### Current Live URL

`https://hozifa-news-seo-platform-54dd4124.dublyo.co`

### How It Was Deployed

1. **Created a PostgreSQL database** on Dublyo
   - Host: `postgres-e11eda1.dublyo.co`
   - Port: `5432`
   - Database: `app`
   - SSL mode: `require`

2. **Created an app stack** from the GitHub repo
   - Repo: `Zizoo24/Hozifa-news-seo-platform`
   - Branch: `claude/setup-news-seo-monorepo-cdPDz`
   - Uses the root `Dockerfile` (backend-only deployment)

3. **Required environment variable:**
   ```
   DATABASE_URL=postgresql://postgres:<password>@postgres-e11eda1.dublyo.co:5432/app?sslmode=require
   ```

4. **Verification endpoint:** `GET /db-check` — returns `{"db":"ok"}` when connected

### Deployment Architecture

- The root `Dockerfile` builds only the **backend** (Express + Prisma)
- It listens on port `3000` (Dublyo default)
- PostgreSQL is hosted as a separate Dublyo managed service
- SSL is required for the database connection (`sslmode=require`)
- Prisma migrations run on first connection

---

## Local Development

### Prerequisites

- Node.js >= 18
- PostgreSQL 14+ (or Docker)
- npm >= 9

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

```bash
# Backend (port 3001)
npm run dev:backend

# Frontend (port 5173)
npm run dev:frontend
```

The frontend dev server proxies `/api` requests to the backend automatically.

### 6. Verify

Open http://localhost:5173 — you should see the health check page.

```bash
curl http://localhost:3001/api/health
# {"status":"ok","db":"ok"}
```

---

## Docker (Production)

```bash
cp .env.example .env
docker compose up --build -d
```

This starts:
- **postgres** on port 5432
- **backend** on port 3001
- **frontend** on port 3000 (nginx serves built assets, proxies `/api` to backend)

---

## Phase Verification Checklists

### Phase 1 — Single URL SEO Analyzer

```bash
# Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Site","domain":"example.com"}'

# Analyze a URL
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","url":"https://example.com"}'
```

- [x] `POST /api/projects` creates a project
- [x] `POST /api/analyze-url` fetches, parses, and stores SEO signals
- [x] Response includes statusCode, title, canonical, h1Count, wordCount, issues
- [x] Frontend `/projects` page creates and lists projects
- [x] Frontend `/analyze` page runs analysis and displays results

### Phase 2 — Controlled Site Crawler

```bash
# Start crawl
curl -X POST http://localhost:3001/api/crawls/start \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","startUrl":"https://example.com/","maxUrls":10,"maxDepth":1,"rateLimitMs":1000}'

# Check status
curl http://localhost:3001/api/crawls/<CRAWL_RUN_ID>
```

- [x] BFS crawl with same-domain enforcement
- [x] Respects maxUrls, maxDepth, rateLimitMs
- [x] Skips non-HTML assets
- [x] Live progress tracking
- [x] Stop running crawls
- [x] Frontend `/crawler` and `/crawls/:id` pages

### Phase 3 — Template Clustering + Developer Backlog

```bash
# Generate clusters from completed crawl
curl -X POST http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/generate-clusters

# List clusters
curl http://localhost:3001/api/crawls/<CRAWL_RUN_ID>/clusters
```

- [x] Groups issues by templateGroup + section + issueCode
- [x] Generates rootCauseHint, devFixSuggestion, validationSteps
- [x] Deterministic mappings for all 8 issue codes
- [x] Idempotent generation
- [x] Frontend cluster cards with export

---

## ARM64 Deployment Notes

All Docker images use multi-arch base images:

- **Backend**: `node:20-bookworm-slim` (Debian glibc — reliable Prisma on ARM64)
- **Frontend build**: `node:20-bookworm-slim`
- **Frontend serve**: `nginx:alpine`
- **Database**: `postgres:16-alpine`

```bash
# Build natively on ARM64
docker compose up --build -d

# Cross-build from x86_64
docker buildx create --use --name multiarch
docker buildx bake --set '*.platform=linux/arm64' --load
```

---

## Security Features

- **Helmet** — security headers
- **CORS** — configurable origins via `CORS_ORIGINS` env var
- **Rate limiting** — 100 requests per 15-minute window
- **Non-root Docker user** — runs as `appuser` (UID 1001)
- **Resource limits** — memory caps on all containers
