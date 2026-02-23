import { Router } from "express";
import { getPrisma } from "../prisma";
import { requireDb } from "../middleware/requireDb";

const router = Router();

router.get("/crawl-runs/:id", requireDb, async (req, res, next) => {
  try {
    const run = await getPrisma().crawlRun.findUnique({
      where: { id: req.params.id as string },
      include: { urlRecords: true, project: true },
    });
    if (!run) {
      res.status(404).json({ error: "Crawl run not found" });
      return;
    }
    res.json(run);
  } catch (err) {
    next(err);
  }
});

export default router;
