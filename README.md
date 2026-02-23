# News SEO Platform

Full-stack monorepo for news website SEO auditing: React + Vite frontend, Express + Prisma backend, PostgreSQL database.

**Database is optional** — the SEO Analyzer works without a database. Projects and Crawler features require PostgreSQL.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | _(empty)_ | PostgreSQL connection string. If not set, DB features are disabled. |
| `AUTH_DISABLED` | No | `true` | Set to `true` to bypass login (demo mode). |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `3000` | Server port |
| `CORS_ORIGINS` | No | _(allow all)_ | Comma-separated allowed origins |
| `APP_BASE_URL` | No | `http://localhost:3000` | Public URL of the app |

### For Dublyo deployment, set these env vars:

```
DATABASE_URL=postgresql://user:pass@postgres-XXXX.dublyo.co:5432/dbname?sslmode=require
AUTH_DISABLED=true
NODE_ENV=production
```

---

## Running WITHOUT Database (DB Optional)

```bash
npm install
npm run dev:backend
# Backend starts on port 3000
# Visit http://localhost:3000 — Dashboard shows DB: "Not configured"
# SEO Analyzer works fully — just paste a URL and analyze
```

The app runs normally. Features that need a database return a clear 503 JSON:
```json
{"error":"db_unavailable","message":"Database is not connected yet."}
```

---

## Running WITH Database

```bash
# 1. Start PostgreSQL
docker compose up postgres -d

# 2. Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/news_seo?schema=public"

# 3. Run migrations
cd backend && npx prisma migrate dev --name init && cd ..

# 4. Start
npm run dev:backend
```

Now all features work: Projects, Crawler, and results are persisted.

---

## Disabling Auth (AUTH_DISABLED=true)

```bash
export AUTH_DISABLED=true
```

When `AUTH_DISABLED=true`:
- No login screen
- All routes accessible
- Treated as admin demo user

When `AUTH_DISABLED=false` (or unset): auth middleware kicks in (when implemented).

---

## API Endpoints

| Method | Path | DB Required | Description |
|--------|------|:-----------:|-------------|
| `GET` | `/api/health` | No | Returns `{status, db}` — db is `ok`, `error`, or `skipped` |
| `GET` | `/api/env-check` | No | Returns env info (host only, no secrets) |
| `GET` | `/api/db-check` | No | Database connectivity test |
| `POST` | `/api/analyze` | **No** | Analyze any URL for SEO issues (no DB needed) |
| `POST` | `/api/analyze-url` | Yes | Analyze + persist results to DB |
| `POST` | `/api/projects` | Yes | Create a project |
| `GET` | `/api/projects` | Yes | List all projects |
| `POST` | `/api/crawls/start` | Yes | Start a BFS crawl |
| `GET` | `/api/crawls/:id` | Yes | Get crawl status |
| `GET` | `/api/crawls/:id/urls` | Yes | List crawled URLs |
| `POST` | `/api/crawls/:id/stop` | Yes | Stop a running crawl |
| `POST` | `/api/crawls/:id/generate-clusters` | Yes | Generate issue clusters |
| `GET` | `/api/crawls/:id/clusters` | Yes | List issue clusters |

---

## Deployment Verification

After deploying, check these three endpoints:

```bash
# 1. Health check
curl https://your-domain.dublyo.co/api/health
# Expected: {"status":"ok","db":"ok"}     (with DB)
# Expected: {"status":"ok","db":"skipped"} (without DB)

# 2. Environment check (no secrets leaked)
curl https://your-domain.dublyo.co/api/env-check
# Expected: {"hasDatabaseUrl":true,"databaseHost":"postgres-xxx:5432","nodeEnv":"production",...}

# 3. Database check
curl https://your-domain.dublyo.co/api/db-check
# Expected: {"db":"ok"}             (connected)
# Expected: {"db":"skipped","reason":"DATABASE_URL not set"}  (no DB)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, TypeScript, React Router |
| **Backend** | Express 4, TypeScript, Node.js 20 |
| **Database** | PostgreSQL 16 (optional) |
| **ORM** | Prisma |
| **Containers** | Docker, Docker Compose |
| **Deployment** | Dublyo |

---

## Docker (Production)

```bash
# With database
cp .env.example .env  # set POSTGRES_PASSWORD
docker compose up --build -d

# Without database (backend only)
docker build -t news-seo .
docker run -p 3000:3000 -e AUTH_DISABLED=true news-seo
```

---

## Project Structure

```
news-seo-platform/
├── Dockerfile                 # Single container: backend + frontend
├── docker-compose.yml         # Full stack: postgres + backend + frontend
├── backend/
│   ├── prisma/schema.prisma   # DB models
│   └── src/
│       ├── index.ts           # Express app + static file serving
│       ├── prisma.ts          # Lazy Prisma client (DB optional)
│       ├── config/env.ts      # All env vars
│       ├── middleware/
│       │   ├── errorHandler.ts
│       │   └── requireDb.ts   # 503 guard for DB-dependent routes
│       ├── routes/            # All API routes
│       ├── services/          # SEO analysis, HTTP fetch, HTML parsing
│       └── modules/           # Crawler, clustering engine
└── frontend/
    └── src/
        ├── App.tsx            # Router: Dashboard, Analyzer, Projects, Crawler
        └── pages/
            ├── Dashboard.tsx  # Status overview
            ├── Analyze.tsx    # SEO Analyzer (no DB needed)
            ├── Projects.tsx   # Project management (needs DB)
            ├── Crawler.tsx    # Site crawler (needs DB)
            └── CrawlDetail.tsx
```
