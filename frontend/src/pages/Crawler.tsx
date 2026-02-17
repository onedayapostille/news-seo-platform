import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Project {
  id: string;
  name: string;
  domain: string;
}

export default function Crawler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [startUrl, setStartUrl] = useState("");
  const [maxUrls, setMaxUrls] = useState(200);
  const [maxDepth, setMaxDepth] = useState(2);
  const [rateLimitMs, setRateLimitMs] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Project[]>("/api/projects").then(setProjects).catch(console.error);
  }, []);

  // Auto-fill startUrl when project changes
  useEffect(() => {
    if (projectId) {
      const p = projects.find((pr) => pr.id === projectId);
      if (p && !startUrl) {
        setStartUrl("https://" + p.domain + "/");
      }
    }
  }, [projectId, projects]);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ crawlRunId: string }>("/api/crawls/start", {
        projectId,
        startUrl,
        maxUrls,
        maxDepth,
        rateLimitMs,
      });
      navigate("/crawls/" + data.crawlRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start crawl");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Site Crawler</h2>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Crawl a site to analyze multiple pages. Same-domain only.
      </p>

      <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "500px", marginBottom: "1rem" }}>
        <label>
          <span style={labelSpan}>Project</span>
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setStartUrl(""); }} required style={{ width: "100%" }}>
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.domain})</option>
            ))}
          </select>
        </label>

        <label>
          <span style={labelSpan}>Start URL</span>
          <input type="url" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://example.com/" required style={{ width: "100%" }} />
        </label>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 1 }}>
            <span style={labelSpan}>Max URLs</span>
            <input type="number" min={1} max={1000} value={maxUrls} onChange={(e) => setMaxUrls(Number(e.target.value))} style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={labelSpan}>Max Depth</span>
            <input type="number" min={0} max={10} value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={labelSpan}>Rate Limit (ms)</span>
            <input type="number" min={200} max={10000} value={rateLimitMs} onChange={(e) => setRateLimitMs(Number(e.target.value))} style={{ width: "100%" }} />
          </label>
        </div>

        <button type="submit" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? "Starting..." : "Start Crawl"}
        </button>
      </form>

      {error && <div style={{ color: "#dc2626" }}><strong>Error:</strong> {error}</div>}
    </div>
  );
}

const labelSpan: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.25rem",
};
