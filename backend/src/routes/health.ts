import { Router } from "express";
import { healthCheck } from "../services/health";

const router = Router();

router.get("/health", async (_req, res, next) => {
  try {
    const result = await healthCheck();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
