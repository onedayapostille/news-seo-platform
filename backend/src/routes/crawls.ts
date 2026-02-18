import { Router } from "express";
import { prisma } from "../prisma";
import { startCrawl, stopCrawl } from "../modules/crawler/crawlManager";

const router = Router();

router.post("/crawls/start", async (req, res, next) => {
  try {
    const { projectId, startUrl, maxUrls = 200, maxDepth = 2, rateLimitMs = 1000 } = req.body;

    if (!projectId || !startUrl) {
      res.status(400).json({ error: "projectId and startUrl are required" });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(startUrl);
    } catch {
      res.status(400).json({ error: "Invalid startUrl format" });
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "startUrl must use http or https" });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Enforce same-domain: startUrl host must match project domain
    const urlHost = parsed.hostname;
    if (urlHost !== project.domain && !urlHost.endsWith("." + project.domain)) {
      res.status(400).json({
        error: `startUrl host "${urlHost}" does not match project domain "${project.domain}"`,
      });
      return;
    }

    const clampedMaxUrls = Math.min(Math.max(1, Number(maxUrls) || 200), 1000);
    const clampedMaxDepth = Math.min(Math.max(0, Number(maxDepth) || 2), 10);
    const clampedRate = Math.max(200, Number(rateLimitMs) || 1000);

    const crawlRun = await prisma.crawlRun.create({
      data: {
        projectId,
        startUrl,
        status: "queued",
        maxUrls: clampedMaxUrls,
        maxDepth: clampedMaxDepth,
      },
    });

    // Fire and forget — crawl runs in the background
    startCrawl({
      crawlRunId: crawlRun.id,
      projectId,
      startUrl,
      maxUrls: clampedMaxUrls,
      maxDepth: clampedMaxDepth,
      rateLimitMs: clampedRate,
    });

    res.status(201).json({ crawlRunId: crawlRun.id });
  } catch (err) {
    next(err);
  }
});

router.get("/crawls/:id", async (req, res, next) => {
  try {
    const crawlRun = await prisma.crawlRun.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!crawlRun) {
      res.status(404).json({ error: "Crawl run not found" });
      return;
    }

    const records = await prisma.urlRecord.findMany({
      where: { crawlRunId: crawlRun.id },
      select: { statusCode: true, issuesJson: true },
    });

    const totalStored = records.length;
    const statusCodes: Record<string, number> = {};
    const issueCounts: Record<string, number> = {};

    for (const r of records) {
      const code = String(r.statusCode || "unknown");
      statusCodes[code] = (statusCodes[code] || 0) + 1;

      if (Array.isArray(r.issuesJson)) {
        for (const issue of r.issuesJson as Array<{ code: string }>) {
          issueCounts[issue.code] = (issueCounts[issue.code] || 0) + 1;
        }
      }
    }

    const recentUrls = await prisma.urlRecord.findMany({
      where: { crawlRunId: crawlRun.id },
      orderBy: { analyzedAt: "desc" },
      take: 10,
    });

    res.json({
      crawlRun,
      counts: { totalStored, statusCodes, issueCounts },
      recentUrls,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/crawls/:id/urls", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 5000);
    const offset = parseInt(req.query.offset as string) || 0;

    const [records, total] = await Promise.all([
      prisma.urlRecord.findMany({
        where: { crawlRunId: req.params.id },
        orderBy: { analyzedAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.urlRecord.count({
        where: { crawlRunId: req.params.id },
      }),
    ]);

    res.json({ records, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.post("/crawls/:id/stop", async (req, res, next) => {
  try {
    const stopped = stopCrawl(req.params.id);
    if (!stopped) {
      res.status(404).json({ error: "Crawl not active or already finished" });
      return;
    }
    res.json({ message: "Stop signal sent" });
  } catch (err) {
    next(err);
  }
});

export default router;
