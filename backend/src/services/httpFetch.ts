export interface FetchResult {
  statusCode: number;
  finalUrl: string;
  html: string;
}

// Realistic browser User-Agent to avoid being blocked by Cloudflare / WAFs
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

export async function httpFetch(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let currentUrl = url;
    let redirects = 0;

    for (;;) {
      const res = await fetch(currentUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
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
