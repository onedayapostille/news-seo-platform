import { Router } from "express";
import { prisma } from "../prisma";
import { generateClusters } from "../modules/clustering/clusterEngine";

const router = Router();

router.post("/crawls/:id/generate-clusters", async (req, res, next) => {
  try {
    const crawlRun = await prisma.crawlRun.findUnique({
      where: { id: req.params.id },
    });
    if (!crawlRun) {
      res.status(404).json({ error: "Crawl run not found" });
      return;
    }
    if (crawlRun.status !== "done" && crawlRun.status !== "stopped") {
      res.status(400).json({ error: "Crawl must be finished before generating clusters" });
      return;
    }

    const count = await generateClusters(req.params.id);

    const clusters = await prisma.issueCluster.findMany({
      where: { crawlRunId: req.params.id },
      orderBy: { affectedCount: "desc" },
    });

    res.json({ clustersGenerated: count, clusters });
  } catch (err) {
    next(err);
  }
});

router.get("/crawls/:id/clusters", async (req, res, next) => {
  try {
    const crawlRun = await prisma.crawlRun.findUnique({
      where: { id: req.params.id },
    });
    if (!crawlRun) {
      res.status(404).json({ error: "Crawl run not found" });
      return;
    }

    const clusters = await prisma.issueCluster.findMany({
      where: { crawlRunId: req.params.id },
      orderBy: { affectedCount: "desc" },
    });

    res.json(clusters);
  } catch (err) {
    next(err);
  }
});

export default router;
