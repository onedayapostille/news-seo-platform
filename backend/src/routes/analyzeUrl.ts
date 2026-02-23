import { Router } from "express";
import { getPrisma, hasDatabase, isDbAvailable } from "../prisma";
import { httpFetch } from "../services/httpFetch";
import { parseHtml } from "../services/htmlParse";
import { normalizeUrl } from "../services/urlNormalize";
import { detectIssues } from "../services/issueEngine";
import { detectTemplate } from "../services/templateDetect";

const router = Router();

// Standalone analyze — works without DB, just returns SEO data
router.post("/analyze", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

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

    const fetchResult = await httpFetch(url);
    const parsed = parseHtml(fetchResult.html, fetchResult.finalUrl);
    const issues = detectIssues(parsed);
    const normalized = normalizeUrl(fetchResult.finalUrl);
    const finalParsed = new URL(fetchResult.finalUrl);
    const template = detectTemplate(finalParsed.pathname);
    const pathParts = finalParsed.pathname.split("/").filter(Boolean);
    const section = pathParts.length > 0 ? pathParts[0] : null;

    res.json({
      url: fetchResult.finalUrl,
      normalizedUrl: normalized,
      statusCode: fetchResult.statusCode,
      title: parsed.title,
      metaDescription: parsed.metaDescription,
      canonical: parsed.canonical,
      robotsMeta: parsed.robotsMeta,
      h1Count: parsed.h1Count,
      wordCount: parsed.wordCount,
      internalLinksCount: parsed.internalLinksCount,
      externalLinksCount: parsed.externalLinksCount,
      hasJsonLd: parsed.hasJsonLd,
      templateGroup: template,
      section,
      issues,
      savedToDb: false,
    });
  } catch (err) {
    next(err);
  }
});

// Full analyze — requires DB to persist results
router.post("/analyze-url", async (req, res, next) => {
  try {
    const { projectId, url } = req.body;

    if (!projectId || !url) {
      res.status(400).json({ error: "projectId and url are required" });
      return;
    }

    if (!hasDatabase() || !isDbAvailable()) {
      res.status(503).json({
        error: "db_unavailable",
        message: "Database is not connected yet. Use /api/analyze for DB-free analysis.",
      });
      return;
    }

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

    const prisma = getPrisma();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const fetchResult = await httpFetch(url);
    const parsed = parseHtml(fetchResult.html, fetchResult.finalUrl);
    const issues = detectIssues(parsed);
    const normalized = normalizeUrl(fetchResult.finalUrl);
    const finalParsed = new URL(fetchResult.finalUrl);
    const template = detectTemplate(finalParsed.pathname);
    const pathParts = finalParsed.pathname.split("/").filter(Boolean);
    const section = pathParts.length > 0 ? pathParts[0] : null;

    const crawlRun = await prisma.crawlRun.create({
      data: {
        projectId,
        status: "done",
        maxUrls: 1,
        maxDepth: 0,
        finishedAt: new Date(),
      },
    });

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

    res.status(201).json({ ...urlRecord, issues, savedToDb: true });
  } catch (err) {
    next(err);
  }
});

export default router;
