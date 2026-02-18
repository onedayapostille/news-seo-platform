import * as cheerio from "cheerio";

export interface ParsedPage {
  canonical: string | null;
  robotsMeta: string | null;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  hasJsonLd: boolean;
}

export function parseHtml(html: string, baseUrl: string): ParsedPage {
  const $ = cheerio.load(html);
  const host = new URL(baseUrl).hostname;

  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const robotsMeta = $('meta[name="robots"]').attr("content") || null;
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content") || null;

  const h1Count = $("h1").length;

  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;

  // Links (count before removing elements)
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, baseUrl);
      if (linkUrl.protocol !== "http:" && linkUrl.protocol !== "https:") return;
      if (linkUrl.hostname === host) {
        internalLinksCount++;
      } else {
        externalLinksCount++;
      }
    } catch {
      // invalid URL, skip
    }
  });

  // Word count: remove non-visible elements, count tokens
  $("script, style, noscript").remove();
  const visibleText = $("body").text();
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;

  return {
    canonical,
    robotsMeta,
    title,
    metaDescription,
    h1Count,
    wordCount,
    internalLinksCount,
    externalLinksCount,
    hasJsonLd,
  };
}
