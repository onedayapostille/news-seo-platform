# Root Dockerfile — single container for Dublyo (backend + frontend)

# ---- Frontend builder ----
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=frontend

WORKDIR /app/frontend

COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src ./src/

RUN npm run build

# ---- Backend builder ----
FROM node:20-bookworm-slim AS backend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

RUN npm ci --workspace=backend

WORKDIR /app/backend

COPY backend/tsconfig.json ./
COPY backend/src ./src/

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npx tsc

# ---- Production ----
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends wget openssl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/false --create-home appuser

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

RUN npm ci --workspace=backend --omit=dev && \
    cd backend && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

WORKDIR /app/backend

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# prisma migrate deploy only runs if DATABASE_URL is set
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then npx prisma migrate deploy 2>/dev/null || true; fi && node dist/index.js"]
