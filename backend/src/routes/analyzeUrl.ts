import { Router } from "express";
import { prisma } from "../prisma";
import { httpFetch } from "../services/httpFetch";
import { parseHtml } from "../services/htmlParse";
import { normalizeUrl } from "../services/urlNormalize";
import { detectIssues } from "../services/issueEngine";
import { detectTemplate } from "../services/templateDetect";

const router = Router();

router.post("/analyze-url", async (req, res, next) => {
  try {
    const { projectId, url } = req.body;

    if (!projectId || !url) {
      res.status(400).json({ error: "projectId and url are required" });
      return;
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid URL format" });
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      res.status(400).json({ error: "URL must use http or https" });
      return;
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Fetch the page
    const fetchResult = await httpFetch(url);

    // Parse HTML
    const parsed = parseHtml(fetchResult.html, fetchResult.finalUrl);

    // Detect issues
    const issues = detectIssues(parsed);

    // Normalize URL + detect template/section
    const normalized = normalizeUrl(fetchResult.finalUrl);
    const finalParsed = new URL(fetchResult.finalUrl);
    const template = detectTemplate(finalParsed.pathname);
    const pathParts = finalParsed.pathname.split("/").filter(Boolean);
    const section = pathParts.length > 0 ? pathParts[0] : null;

    // Create CrawlRun (single-URL analysis)
    const crawlRun = await prisma.crawlRun.create({
      data: {
        projectId,
        status: "done",
        maxUrls: 1,
        maxDepth: 0,
        finishedAt: new Date(),
      },
    });

    // Store UrlRecord
    const urlRecord = await prisma.urlRecord.create({
      data: {
        crawlRunId: crawlRun.id,
        url: fetchResult.finalUrl,
        normalizedUrl: normalized,
        section,
        templateGroup: template,
        statusCode: fetchResult.statusCode,
        canonical: parsed.canonical,
        robotsMeta: parsed.robotsMeta,
        title: parsed.title,
        metaDescription: parsed.metaDescription,
        h1Count: parsed.h1Count,
        wordCount: parsed.wordCount,
        internalLinksCount: parsed.internalLinksCount,
        externalLinksCount: parsed.externalLinksCount,
        issuesJson: issues as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    res.status(201).json({ ...urlRecord, issues });
  } catch (err) {
    next(err);
  }
});

export default router;
