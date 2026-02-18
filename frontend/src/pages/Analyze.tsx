import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

interface Project {
  id: string;
  name: string;
  domain: string;
}

interface Issue {
  code: string;
  message: string;
}

interface UrlRecord {
  id: string;
  url: string;
  normalizedUrl: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1Count: number | null;
  wordCount: number | null;
  internalLinksCount: number | null;
  externalLinksCount: number | null;
  templateGroup: string | null;
  section: string | null;
  issuesJson: Issue[] | null;
  issues?: Issue[];
  analyzedAt: string;
}

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrlRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    api.get<Project[]>("/api/projects").then(setProjects).catch(console.error);
  }, []);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post<UrlRecord>("/api/analyze-url", { projectId, url });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const exportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seo-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const issues = result?.issues || (result?.issuesJson as Issue[]) || [];

  return (
    <div>
      <h2>Analyze URL</h2>

      <form onSubmit={analyze} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.domain})
            </option>
          ))}
        </select>
        <input
          type="url"
          placeholder="https://example.com/page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ flex: 1, minWidth: "200px" }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && (
        <div style={{ color: "#dc2626", marginBottom: "1rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div>
          <h3>Results</h3>

          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "1rem" }}>
            <tbody>
              {([
                ["Status Code", result.statusCode],
                ["URL", result.url],
                ["Title", result.title],
                ["Meta Description", result.metaDescription],
                ["Canonical", result.canonical],
                ["Robots Meta", result.robotsMeta],
                ["H1 Count", result.h1Count],
                ["Word Count", result.wordCount],
                ["Internal Links", result.internalLinksCount],
                ["External Links", result.externalLinksCount],
                ["Template", result.templateGroup],
                ["Section", result.section],
              ] as [string, unknown][]).map(([label, value]) => (
                <tr key={label}>
                  <td style={labelStyle}>{label}</td>
                  <td style={valueStyle}>{value != null ? String(value) : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Issues ({issues.length})</h3>
          {issues.length === 0 ? (
            <p style={{ color: "#16a34a" }}>No issues found.</p>
          ) : (
            <ul style={{ marginBottom: "1rem" }}>
              {issues.map((issue, i) => (
                <li key={i} style={{ color: "#dc2626", marginBottom: "0.25rem" }}>
                  <code>{issue.code}</code> &mdash; {issue.message}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "Hide" : "Show"} Raw JSON
            </button>
            <button onClick={exportJson}>Export JSON</button>
          </div>

          {showRaw && (
            <pre
              style={{
                background: "#1f2937",
                color: "#e5e7eb",
                padding: "1rem",
                borderRadius: "0.5rem",
                overflow: "auto",
                maxHeight: "400px",
                fontSize: "0.8rem",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  padding: "0.4rem 1rem 0.4rem 0",
  fontWeight: 600,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const valueStyle: React.CSSProperties = {
  padding: "0.4rem 0",
  borderBottom: "1px solid #e5e7eb",
  wordBreak: "break-all",
};
