const SKIP_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".css", ".js", ".json", ".xml", ".rss", ".atom",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".mp4", ".mp3", ".avi", ".mov", ".wmv", ".flv", ".webm",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
]);

export function isSameHost(url: string, allowedHost: string): boolean {
  try {
    return new URL(url).hostname === allowedHost;
  } catch {
    return false;
  }
}

export function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const lastSegment = parsed.pathname.split("/").pop() || "";
    const dotIdx = lastSegment.lastIndexOf(".");
    if (dotIdx > 0) {
      const ext = "." + lastSegment.slice(dotIdx + 1).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) return false;
    }

    return true;
  } catch {
    return false;
  }
}
