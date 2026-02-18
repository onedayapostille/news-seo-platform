import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

interface Issue { code: string; message: string }

interface UrlRecord {
  id: string;
  url: string;
  statusCode: number | null;
  title: string | null;
  canonical: string | null;
  issuesJson: Issue[] | null;
  analyzedAt: string;
}

interface CrawlRun {
  id: string;
  status: string;
  startUrl: string | null;
  maxUrls: number;
  maxDepth: number;
  startedAt: string;
  finishedAt: string | null;
  progressJson: { processed: number; queued: number; visited: number } | null;
  project: { name: string; domain: string };
}

interface CrawlResponse {
  crawlRun: CrawlRun;
  counts: {
    totalStored: number;
    statusCodes: Record<string, number>;
    issueCounts: Record<string, number>;
  };
  recentUrls: UrlRecord[];
}

interface UrlsResponse {
  records: UrlRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface IssueCluster {
  id: string;
  crawlRunId: string;
  templateGroup: string | null;
  section: string | null;
  issueCode: string;
  affectedCount: number;
  sampleUrlsJson: string[];
  rootCauseHint: string;
  devFixSuggestion: string;
  validationSteps: string;
  createdAt: string;
}

type Tab = "overview" | "clusters";

export default function CrawlDetail() {
  const { id } = useParams<{ id: string }>();
  const [crawl, setCrawl] = useState<CrawlResponse | null>(null);
  const [urls, setUrls] = useState<UrlsResponse | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const statusRef = useRef("");
  const PAGE_SIZE = 50;

  // Clusters state
  const [tab, setTab] = useState<Tab>("overview");
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [clustersLoaded, setClustersLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadCrawl = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<CrawlResponse>("/api/crawls/" + id);
      setCrawl(data);
      statusRef.current = data.crawlRun.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load crawl");
    }
  }, [id]);

  const loadUrls = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<UrlsResponse>(
        "/api/crawls/" + id + "/urls?limit=" + PAGE_SIZE + "&offset=" + page * PAGE_SIZE,
      );
      setUrls(data);
    } catch {
      // silent
    }
  }, [id, page]);

  const loadClusters = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<IssueCluster[]>("/api/crawls/" + id + "/clusters");
      setClusters(data);
      setClustersLoaded(true);
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    loadCrawl();
    loadUrls();
    const interval = setInterval(() => {
      const s = statusRef.current;
      if (s === "queued" || s === "running") {
        loadCrawl();
        loadUrls();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [loadCrawl, loadUrls]);

  useEffect(() => {
    loadUrls();
  }, [page, loadUrls]);

  // Load clusters when switching to clusters tab
  useEffect(() => {
    if (tab === "clusters" && !clustersLoaded) {
      loadClusters();
    }
  }, [tab, clustersLoaded, loadClusters]);

  const stop = async () => {
    if (!id) return;
    setStopping(true);
    try {
      await api.post("/api/crawls/" + id + "/stop", {});
      loadCrawl();
    } catch {
      // ignore
    } finally {
      setStopping(false);
    }
  };

  const generateClusters = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const data = await api.post<{ clustersGenerated: number; clusters: IssueCluster[] }>(
        "/api/crawls/" + id + "/generate-clusters",
        {},
      );
      setClusters(data.clusters);
      setClustersLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate clusters");
    } finally {
      setGenerating(false);
    }
  };

  const exportJson = async () => {
    if (!id) return;
    const data = await api.get<UrlsResponse>("/api/crawls/" + id + "/urls?limit=5000&offset=0");
    const blob = new Blob([JSON.stringify(data.records, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "crawl-" + id + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCsv = async () => {
    if (!id) return;
    const data = await api.get<UrlsResponse>("/api/crawls/" + id + "/urls?limit=5000&offset=0");
    const header = "url,statusCode,canonical,title,issueCodes\n";
    const rows = data.records
      .map((r) => {
        const codes = Array.isArray(r.issuesJson)
          ? r.issuesJson.map((i) => i.code).join(";")
          : "";
        return [
          '"' + (r.url || "").replace(/"/g, '""') + '"',
          r.statusCode ?? "",
          '"' + (r.canonical || "").replace(/"/g, '""') + '"',
          '"' + (r.title || "").replace(/"/g, '""') + '"',
          '"' + codes + '"',
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "crawl-" + id + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportClustersJson = () => {
    if (clusters.length === 0) return;
    const blob = new Blob([JSON.stringify(clusters, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clusters-" + id + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) return <div style={{ color: "#dc2626" }}><strong>Error:</strong> {error}</div>;
  if (!crawl) return <p>Loading...</p>;

  const run = crawl.crawlRun;
  const progress = run.progressJson;
  const isActive = run.status === "queued" || run.status === "running";
  const isDone = run.status === "done" || run.status === "stopped";
  const pct = progress && run.maxUrls > 0 ? Math.round((progress.processed / run.maxUrls) * 100) : 0;
  const totalPages = urls ? Math.ceil(urls.total / PAGE_SIZE) : 0;

  return (
    <div>
      <h2>Crawl: {run.project.name}</h2>

      {/* Status + controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <StatusBadge status={run.status} />
        {isActive && (
          <button onClick={stop} disabled={stopping} style={{ backgroundColor: "#dc2626" }}>
            {stopping ? "Stopping..." : "Stop Crawl"}
          </button>
        )}
        {!isActive && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={exportJson}>Export JSON</button>
            <button onClick={exportCsv} style={{ backgroundColor: "#059669" }}>Export CSV</button>
          </div>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            <span>Processed {progress.processed} / {run.maxUrls} URLs</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", backgroundColor: isActive ? "#2563eb" : "#16a34a", transition: "width 0.3s" }} />
          </div>
          {isActive && <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>{progress.queued} URLs in queue</p>}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Card label="Start URL" value={run.startUrl || "\u2014"} />
        <Card label="Max Depth" value={String(run.maxDepth)} />
        <Card label="Total Stored" value={String(crawl.counts.totalStored)} />
        <Card label="Started" value={new Date(run.startedAt).toLocaleString()} />
        {run.finishedAt && <Card label="Finished" value={new Date(run.finishedAt).toLocaleString()} />}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
        <TabButton label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton label="Clusters" active={tab === "clusters"} onClick={() => setTab("clusters")} />
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {Object.keys(crawl.counts.statusCodes).length > 0 && (
              <div>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Status Codes</h3>
                {Object.entries(crawl.counts.statusCodes)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([code, count]) => (
                    <div key={code} style={{ fontSize: "0.85rem" }}>
                      <code>{code}</code>: {count}
                    </div>
                  ))}
              </div>
            )}
            {Object.keys(crawl.counts.issueCounts).length > 0 && (
              <div>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Issue Distribution</h3>
                {Object.entries(crawl.counts.issueCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, count]) => (
                    <div key={code} style={{ fontSize: "0.85rem" }}>
                      <code>{code}</code>: {count}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* URL Table */}
          {urls && urls.records.length > 0 && (
            <div>
              <h3 style={{ marginBottom: "0.5rem" }}>Crawled URLs ({urls.total})</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>URL</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urls.records.map((r) => {
                      const issueCount = Array.isArray(r.issuesJson) ? r.issuesJson.length : 0;
                      return (
                        <tr key={r.id}>
                          <td style={{ ...tdStyle, maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
                          </td>
                          <td style={tdStyle}>{r.statusCode ?? "\u2014"}</td>
                          <td style={{ ...tdStyle, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.title || "\u2014"}
                          </td>
                          <td style={tdStyle}>
                            {issueCount > 0 ? (
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>{issueCount}</span>
                            ) : (
                              <span style={{ color: "#16a34a" }}>0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem" }}>
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                    Prev
                  </button>
                  <span style={{ fontSize: "0.85rem" }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Clusters tab */}
      {tab === "clusters" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            {isDone && (
              <button onClick={generateClusters} disabled={generating} style={{ backgroundColor: "#7c3aed" }}>
                {generating ? "Generating..." : clusters.length > 0 ? "Regenerate Clusters" : "Generate Clusters"}
              </button>
            )}
            {clusters.length > 0 && (
              <button onClick={exportClustersJson} style={{ backgroundColor: "#059669" }}>
                Export Clusters JSON
              </button>
            )}
          </div>

          {!clustersLoaded && <p style={{ color: "#6b7280" }}>Loading clusters...</p>}

          {clustersLoaded && clusters.length === 0 && (
            <p style={{ color: "#6b7280" }}>
              No clusters yet. {isDone ? "Click \"Generate Clusters\" to create them." : "Clusters can be generated after the crawl finishes."}
            </p>
          )}

          {clusters.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {clusters.map((c) => (
                <ClusterCard key={c.id} cluster={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: IssueCluster }) {
  const [expanded, setExpanded] = useState(false);

  const issueColor: Record<string, string> = {
    MISSING_TITLE: "#dc2626",
    LONG_TITLE: "#ea580c",
    MISSING_META: "#dc2626",
    LONG_META: "#ea580c",
    MULTI_H1: "#d97706",
    NOINDEX: "#dc2626",
    MISSING_CANONICAL: "#d97706",
    THIN_CONTENT: "#ca8a04",
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        padding: "1rem",
        backgroundColor: "#fff",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span
          style={{
            display: "inline-block",
            padding: "0.2rem 0.6rem",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: issueColor[cluster.issueCode] || "#6b7280",
          }}
        >
          {cluster.issueCode}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#374151" }}>
          <strong>{cluster.affectedCount}</strong> affected URL{cluster.affectedCount !== 1 ? "s" : ""}
        </span>
        {cluster.templateGroup && (
          <span style={{ fontSize: "0.8rem", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
            Template: {cluster.templateGroup}
          </span>
        )}
        {cluster.section && (
          <span style={{ fontSize: "0.8rem", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
            Section: {cluster.section}
          </span>
        )}
      </div>

      {/* Root cause */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Root Cause</div>
        <div style={{ fontSize: "0.85rem", color: "#374151" }}>{cluster.rootCauseHint}</div>
      </div>

      {/* Dev fix */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Dev Fix</div>
        <div style={{ fontSize: "0.85rem", color: "#374151" }}>{cluster.devFixSuggestion}</div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color: "#2563eb",
          cursor: "pointer",
          padding: 0,
          fontSize: "0.85rem",
          fontWeight: 500,
        }}
      >
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div style={{ marginTop: "0.75rem" }}>
          {/* Validation steps */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              Validation Steps
            </div>
            <pre style={{ fontSize: "0.8rem", color: "#374151", whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
              {cluster.validationSteps}
            </pre>
          </div>

          {/* Sample URLs */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              Sample URLs ({cluster.sampleUrlsJson.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {cluster.sampleUrlsJson.map((url, i) => (
                <li key={i} style={{ fontSize: "0.8rem", marginBottom: "0.15rem" }}>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", wordBreak: "break-all" }}>
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "#f59e0b",
    running: "#2563eb",
    done: "#16a34a",
    stopped: "#6b7280",
    failed: "#dc2626",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "#fff",
        backgroundColor: colors[status] || "#6b7280",
      }}
    >
      {status}
    </span>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        padding: "0.5rem 1.25rem",
        fontSize: "0.9rem",
        fontWeight: active ? 600 : 400,
        color: active ? "#2563eb" : "#6b7280",
        cursor: "pointer",
        marginBottom: "-2px",
      }}
    >
      {label}
    </button>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 500, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
};
