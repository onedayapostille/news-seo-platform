export interface FetchResult {
  statusCode: number;
  finalUrl: string;
  html: string;
}

const USER_AGENT = "NewsSEOBot/1.0 (compatible; news-seo-platform)";
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;

export async function httpFetch(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let currentUrl = url;
    let redirects = 0;

    for (;;) {
      const res = await fetch(currentUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || redirects >= MAX_REDIRECTS) {
          const err = new Error(`Too many redirects (>${MAX_REDIRECTS})`);
          (err as any).statusCode = 502;
          throw err;
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirects++;
        continue;
      }

      const html = await res.text();
      return { statusCode: res.status, finalUrl: currentUrl, html };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      const timeout = new Error("Request timed out");
      (timeout as any).statusCode = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
