export interface Issue {
  code: string;
  message: string;
}

export function detectIssues(data: {
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  robotsMeta: string | null;
  canonical: string | null;
}): Issue[] {
  const issues: Issue[] = [];

  if (!data.title) {
    issues.push({ code: "MISSING_TITLE", message: "Page has no <title> tag" });
  } else if (data.title.length > 65) {
    issues.push({
      code: "LONG_TITLE",
      message: `Title is ${data.title.length} chars (max 65)`,
    });
  }

  if (!data.metaDescription) {
    issues.push({
      code: "MISSING_META",
      message: "Page has no meta description",
    });
  } else if (data.metaDescription.length > 160) {
    issues.push({
      code: "LONG_META",
      message: `Meta description is ${data.metaDescription.length} chars (max 160)`,
    });
  }

  if (data.h1Count > 1) {
    issues.push({
      code: "MULTI_H1",
      message: `Page has ${data.h1Count} H1 tags (expected 1)`,
    });
  }

  if (data.robotsMeta && data.robotsMeta.toLowerCase().includes("noindex")) {
    issues.push({ code: "NOINDEX", message: "Page has noindex directive" });
  }

  if (!data.canonical) {
    issues.push({
      code: "MISSING_CANONICAL",
      message: "Page has no canonical URL",
    });
  }

  if (data.wordCount < 200) {
    issues.push({
      code: "THIN_CONTENT",
      message: `Page has only ${data.wordCount} words (min 200)`,
    });
  }

  return issues;
}
