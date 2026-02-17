import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { httpFetch } from "../../services/httpFetch";
import { parseHtml } from "../../services/htmlParse";
import { normalizeUrl } from "../../services/urlNormalize";
import { detectIssues } from "../../services/issueEngine";
import { detectTemplate } from "../../services/templateDetect";
import { extractLinks } from "../../services/linkExtract";
import { isSameHost, isCrawlableUrl } from "../../services/domainPolicy";

interface CrawlOptions {
  crawlRunId: string;
  projectId: string;
  startUrl: string;
  maxUrls: number;
  maxDepth: number;
  rateLimitMs: number;
}

interface QueueItem {
  url: string;
  depth: number;
}

const activeCrawls = new Map<string, { stopped: boolean }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startCrawl(opts: CrawlOptions): Promise<void> {
  const state = { stopped: false };
  activeCrawls.set(opts.crawlRunId, state);

  try {
    await prisma.crawlRun.update({
      where: { id: opts.crawlRunId },
      data: { status: "running" },
    });

    const allowedHost = new URL(opts.startUrl).hostname;
    const visited = new Set<string>();
    const queue: QueueItem[] = [{ url: opts.startUrl, depth: 0 }];
    let processed = 0;

    while (queue.length > 0 && processed < opts.maxUrls && !state.stopped) {
      const item = queue.shift()!;

      let normalized: string;
      try {
        normalized = normalizeUrl(item.url);
      } catch {
        continue;
      }
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        if (processed > 0) {
          await sleep(opts.rateLimitMs);
        }

        const fetchResult = await httpFetch(item.url);

        // Verify final URL is still same host after redirects
        if (!isSameHost(fetchResult.finalUrl, allowedHost)) {
          continue;
        }

        const parsed = parseHtml(fetchResult.html, fetchResult.finalUrl);
        const issues = detectIssues(parsed);

        const finalNormalized = normalizeUrl(fetchResult.finalUrl);
        const finalParsed = new URL(fetchResult.finalUrl);
        const template = detectTemplate(finalParsed.pathname);
        const pathParts = finalParsed.pathname.split("/").filter(Boolean);
        const section = pathParts.length > 0 ? pathParts[0] : null;

        await prisma.urlRecord.create({
          data: {
            crawlRunId: opts.crawlRunId,
            url: fetchResult.finalUrl,
            normalizedUrl: finalNormalized,
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
            issuesJson: issues as unknown as Prisma.InputJsonValue,
          },
        });

        processed++;

        await prisma.crawlRun.update({
          where: { id: opts.crawlRunId },
          data: {
            progressJson: {
              processed,
              queued: queue.length,
              visited: visited.size,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // Extract and enqueue links within depth limit
        if (item.depth < opts.maxDepth) {
          const links = extractLinks(fetchResult.html, fetchResult.finalUrl);
          for (const link of links) {
            if (!isCrawlableUrl(link)) continue;
            if (!isSameHost(link, allowedHost)) continue;
            try {
              const linkNorm = normalizeUrl(link);
              if (!visited.has(linkNorm)) {
                queue.push({ url: link, depth: item.depth + 1 });
              }
            } catch {
              // skip bad URLs
            }
          }
        }
      } catch (err) {
        console.error(
          `[Crawl ${opts.crawlRunId}] Error on ${item.url}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    await prisma.crawlRun.update({
      where: { id: opts.crawlRunId },
      data: {
        status: state.stopped ? "stopped" : "done",
        finishedAt: new Date(),
        progressJson: {
          processed,
          queued: 0,
          visited: visited.size,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error(`[Crawl ${opts.crawlRunId}] Fatal error:`, err);
    await prisma.crawlRun
      .update({
        where: { id: opts.crawlRunId },
        data: { status: "failed", finishedAt: new Date() },
      })
      .catch(() => {});
  } finally {
    activeCrawls.delete(opts.crawlRunId);
  }
}

export function stopCrawl(crawlRunId: string): boolean {
  const state = activeCrawls.get(crawlRunId);
  if (state) {
    state.stopped = true;
    return true;
  }
  return false;
}
