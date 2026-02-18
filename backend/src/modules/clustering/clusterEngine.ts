import { prisma } from "../../prisma";
import { Prisma } from "@prisma/client";

interface Issue {
  code: string;
  message: string;
}

interface ClusterKey {
  templateGroup: string;
  section: string;
  issueCode: string;
}

interface ClusterBucket {
  count: number;
  sampleUrls: string[];
}

const ISSUE_GUIDANCE: Record<
  string,
  { rootCauseHint: string; devFixSuggestion: string; validationSteps: string }
> = {
  MISSING_TITLE: {
    rootCauseHint:
      "The template for these pages does not render a <title> tag, or it is conditionally omitted when data is missing.",
    devFixSuggestion:
      "Ensure every page template includes a <title> tag. Use a fallback pattern: page-specific title > section title > site name.",
    validationSteps:
      "1. View page source and search for <title>.\n2. Confirm the title is non-empty.\n3. Check SSR output if using server-side rendering.",
  },
  LONG_TITLE: {
    rootCauseHint:
      "Title tags exceed 65 characters, often because a long suffix or breadcrumb path is appended automatically.",
    devFixSuggestion:
      "Truncate or restructure the title template. Move branding suffix to the end and keep the unique part under 55 chars.",
    validationSteps:
      "1. Check title length in page source.\n2. Verify truncation logic handles edge cases.\n3. Test with longest possible dynamic values.",
  },
  MISSING_META: {
    rootCauseHint:
      "The meta description tag is absent from the template, or the CMS field is left empty for these pages.",
    devFixSuggestion:
      "Add a <meta name=\"description\"> tag to every template. Auto-generate from the first 150 chars of body text if no manual value is set.",
    validationSteps:
      "1. View page source and search for meta name=\"description\".\n2. Confirm content attribute is non-empty.\n3. Verify auto-generation fallback works.",
  },
  LONG_META: {
    rootCauseHint:
      "Meta descriptions exceed 160 characters, typically from untruncated CMS content or concatenated fields.",
    devFixSuggestion:
      "Enforce a 155-character limit in the template or CMS. Truncate at the last complete word before the limit.",
    validationSteps:
      "1. Check meta description length in source.\n2. Verify the CMS enforces the character limit.\n3. Test with maximum-length content.",
  },
  MULTI_H1: {
    rootCauseHint:
      "Multiple <h1> tags appear because the template uses <h1> for both the page title and section headers, or a widget injects an extra <h1>.",
    devFixSuggestion:
      "Audit the template to ensure exactly one <h1> per page. Demote secondary headings to <h2>. Check included partials and widgets.",
    validationSteps:
      "1. Search page source for all <h1> occurrences.\n2. Confirm only one exists.\n3. Check partial templates and widget markup.",
  },
  NOINDEX: {
    rootCauseHint:
      "A meta robots noindex directive is set, possibly from a staging environment flag, CMS setting, or conditional logic that was not reverted.",
    devFixSuggestion:
      "Review the robots meta tag logic. Ensure noindex is only applied intentionally (e.g. paginated archives, search results). Remove accidental noindex.",
    validationSteps:
      "1. Check for <meta name=\"robots\" content=\"noindex\"> in source.\n2. Verify CMS indexing settings for these pages.\n3. Check for environment-based conditionals.",
  },
  MISSING_CANONICAL: {
    rootCauseHint:
      "No <link rel=\"canonical\"> is rendered. The template may lack this tag entirely, or it is conditionally skipped.",
    devFixSuggestion:
      "Add a self-referencing canonical URL to every indexable page template. Use the absolute URL without query parameters or fragments.",
    validationSteps:
      "1. View source and search for rel=\"canonical\".\n2. Confirm the href is an absolute URL matching the page.\n3. Ensure canonical is present on all indexable templates.",
  },
  THIN_CONTENT: {
    rootCauseHint:
      "Pages have fewer than 200 words of visible text. Common on stub pages, empty category listings, or pages with mostly images/video.",
    devFixSuggestion:
      "Add meaningful descriptive text to thin templates. For listing pages, ensure enough items are displayed. Consider noindexing pages that cannot have sufficient content.",
    validationSteps:
      "1. Check visible word count (exclude nav/footer boilerplate).\n2. Verify the content area has substantive text.\n3. Decide whether to enrich or noindex very thin pages.",
  },
};

const DEFAULT_GUIDANCE = {
  rootCauseHint: "This issue was detected but no specific root cause mapping exists yet.",
  devFixSuggestion: "Investigate the affected URLs and fix the underlying template or content issue.",
  validationSteps: "1. Inspect affected URLs.\n2. Fix the issue.\n3. Re-crawl to verify.",
};

function makeKey(tpl: string, section: string, code: string): string {
  return `${tpl}||${section}||${code}`;
}

function parseKey(key: string): ClusterKey {
  const [templateGroup, section, issueCode] = key.split("||");
  return { templateGroup, section, issueCode };
}

export async function generateClusters(crawlRunId: string): Promise<number> {
  // Delete any existing clusters for this run (idempotent)
  await prisma.issueCluster.deleteMany({ where: { crawlRunId } });

  // Fetch all URL records for the crawl run
  const records = await prisma.urlRecord.findMany({
    where: { crawlRunId },
    select: {
      url: true,
      templateGroup: true,
      section: true,
      issuesJson: true,
    },
  });

  // Build cluster buckets
  const buckets = new Map<string, ClusterBucket>();

  for (const rec of records) {
    if (!Array.isArray(rec.issuesJson)) continue;
    const issues = rec.issuesJson as unknown as Issue[];
    const tpl = rec.templateGroup || "unknown";
    const sec = rec.section || "unknown";

    for (const issue of issues) {
      const key = makeKey(tpl, sec, issue.code);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { count: 0, sampleUrls: [] };
        buckets.set(key, bucket);
      }
      bucket.count++;
      if (bucket.sampleUrls.length < 5) {
        bucket.sampleUrls.push(rec.url);
      }
    }
  }

  // Persist clusters
  const creates: Prisma.IssueClusterCreateManyInput[] = [];
  for (const [key, bucket] of buckets) {
    const { templateGroup, section, issueCode } = parseKey(key);
    const guidance = ISSUE_GUIDANCE[issueCode] || DEFAULT_GUIDANCE;
    creates.push({
      crawlRunId,
      templateGroup,
      section,
      issueCode,
      affectedCount: bucket.count,
      sampleUrlsJson: bucket.sampleUrls,
      rootCauseHint: guidance.rootCauseHint,
      devFixSuggestion: guidance.devFixSuggestion,
      validationSteps: guidance.validationSteps,
    });
  }

  if (creates.length > 0) {
    await prisma.issueCluster.createMany({ data: creates });
  }

  return creates.length;
}
