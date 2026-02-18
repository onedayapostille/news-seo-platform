import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/crawl-runs/:id", async (req, res, next) => {
  try {
    const run = await prisma.crawlRun.findUnique({
      where: { id: req.params.id },
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
