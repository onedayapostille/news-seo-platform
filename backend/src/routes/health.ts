import { Router } from "express";
import { healthCheck } from "../services/health";
import { prisma } from "../prisma";

const router = Router();

router.get("/health", async (_req, res, next) => {
  try {
    const result = await healthCheck();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/db-check", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: "ok" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    res.json({ db: "error", message });
  }
});

export default router;
