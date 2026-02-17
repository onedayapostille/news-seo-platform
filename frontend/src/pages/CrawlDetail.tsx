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

export default function CrawlDetail() {
  const { id } = useParams<{ id: string }>();
  const [crawl, setCrawl] = useState<CrawlResponse | null>(null);
  const [urls, setUrls] = useState<UrlsResponse | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const statusRef = useRef("");
  const PAGE_SIZE = 50;

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

  if (error) return <div style={{ color: "#dc2626" }}><strong>Error:</strong> {error}</div>;
  if (!crawl) return <p>Loading...</p>;

  const run = crawl.crawlRun;
  const progress = run.progressJson;
  const isActive = run.status === "queued" || run.status === "running";
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
        <Card label="Start URL" value={run.startUrl || "—"} />
        <Card label="Max Depth" value={String(run.maxDepth)} />
        <Card label="Total Stored" value={String(crawl.counts.totalStored)} />
        <Card label="Started" value={new Date(run.startedAt).toLocaleString()} />
        {run.finishedAt && <Card label="Finished" value={new Date(run.finishedAt).toLocaleString()} />}
      </div>

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
                      <td style={tdStyle}>{r.statusCode ?? "—"}</td>
                      <td style={{ ...tdStyle, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.title || "—"}
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
