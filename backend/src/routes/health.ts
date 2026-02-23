import { Router } from "express";
import { healthCheck } from "../services/health";
import { hasDatabase, checkDb } from "../prisma";
import { env } from "../config/env";

const router = Router();

router.get("/health", async (_req, res) => {
  const result = await healthCheck();
  res.json(result);
});

router.get("/db-check", async (_req, res) => {
  if (!hasDatabase()) {
    res.json({ db: "skipped", reason: "DATABASE_URL not set" });
    return;
  }
  const ok = await checkDb();
  res.json(ok ? { db: "ok" } : { db: "error", message: "Cannot reach database" });
});

router.get("/env-check", (_req, res) => {
  let databaseHost: string | null = null;
  if (env.databaseUrl) {
    try {
      // Parse host from postgres URL without leaking password
      const url = new URL(env.databaseUrl);
      databaseHost = url.hostname + (url.port ? ":" + url.port : "");
    } catch {
      databaseHost = "invalid-url";
    }
  }

  res.json({
    hasDatabaseUrl: !!env.databaseUrl,
    databaseHost,
    nodeEnv: env.nodeEnv,
    appBaseUrl: env.appBaseUrl || null,
    authDisabled: env.authDisabled,
    port: env.port,
  });
});

export default router;
