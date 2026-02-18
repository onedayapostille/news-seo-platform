# ---- Builder ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src/

RUN npx prisma generate
RUN npx tsc

# ---- Production ----
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/false --create-home appuser

WORKDIR /app

COPY package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend
ENV NODE_ENV=production
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/backend/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

CMD ["npm", "start"]
