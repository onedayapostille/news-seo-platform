export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  authDisabled: process.env.AUTH_DISABLED === "true",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  crawlRateLimitMs: parseInt(process.env.CRAWL_RATE_LIMIT_MS || "1000", 10),
  crawlMaxUrls: parseInt(process.env.CRAWL_MAX_URLS || "200", 10),
  crawlMaxDepth: parseInt(process.env.CRAWL_MAX_DEPTH || "2", 10),
} as const;
