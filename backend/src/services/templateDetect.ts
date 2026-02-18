export function detectTemplate(urlPath: string): string {
  const p = urlPath.toLowerCase();

  if (p === "/" || p === "") return "homepage";
  if (/^\/(category|categories|section|topic)\//.test(p)) return "category";
  if (/^\/(tag|tags)\//.test(p)) return "tag";
  if (/^\/(author|authors|writer)\//.test(p)) return "author";
  if (/^\/(search|results)/.test(p)) return "search";
  if (/^\/(about|contact|privacy|terms|faq)/.test(p)) return "static";
  if (/\/\d{4}\/\d{2}\//.test(p)) return "article";
  if (/\/.+\/.+/.test(p)) return "article";

  return "other";
}
