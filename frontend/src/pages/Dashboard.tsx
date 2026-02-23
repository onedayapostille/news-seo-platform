import { useEffect, useState } from "react";
import { api } from "../api/client";

interface HealthData {
  status: string;
  db: string;
  reason?: string;
}

interface EnvData {
  hasDatabaseUrl: boolean;
  databaseHost: string | null;
  nodeEnv: string;
  appBaseUrl: string | null;
  authDisabled: boolean;
  port: number;
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [env, setEnv] = useState<EnvData | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [envErr, setEnvErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const h = await api.get<HealthData>("/api/health");
      setHealth(h);
      setHealthErr(null);
    } catch (e) {
      setHealthErr(e instanceof Error ? e.message : "Failed to reach backend");
    }
    try {
      const ev = await api.get<EnvData>("/api/env-check");
      setEnv(ev);
      setEnvErr(null);
    } catch (e) {
      setEnvErr(e instanceof Error ? e.message : "Failed to fetch env");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dot = (color: string) => ({
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: color,
    marginRight: 8,
  });

  const dbColor = health?.db === "ok" ? "#16a34a" : health?.db === "skipped" ? "#eab308" : "#dc2626";
  const apiColor = health ? "#16a34a" : "#dc2626";

  return (
    <div>
      <h2>Dashboard</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        System status and configuration overview
      </p>

      {loading && <p>Loading...</p>}

      {!loading && (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {/* API Status Card */}
          <div style={card}>
            <h3 style={cardTitle}>Backend API</h3>
            {healthErr ? (
              <div>
                <span style={dot("#dc2626")} />
                <span style={{ color: "#dc2626", fontWeight: 600 }}>Unreachable</span>
                <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 8 }}>{healthErr}</p>
              </div>
            ) : (
              <div>
                <span style={dot(apiColor)} />
                <span style={{ color: apiColor, fontWeight: 600 }}>Running</span>
              </div>
            )}
          </div>

          {/* DB Status Card */}
          <div style={card}>
            <h3 style={cardTitle}>Database</h3>
            {health ? (
              <div>
                <span style={dot(dbColor)} />
                <span style={{ color: dbColor, fontWeight: 600 }}>
                  {health.db === "ok" ? "Connected" : health.db === "skipped" ? "Not configured" : "Error"}
                </span>
                {health.reason && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>{health.reason}</p>
                )}
                {env?.databaseHost && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>
                    Host: <code>{env.databaseHost}</code>
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>--</p>
            )}
          </div>

          {/* Environment Card */}
          <div style={card}>
            <h3 style={cardTitle}>Environment</h3>
            {envErr ? (
              <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{envErr}</p>
            ) : env ? (
              <table style={{ fontSize: "0.85rem", width: "100%" }}>
                <tbody>
                  <Row label="NODE_ENV" value={env.nodeEnv} />
                  <Row label="Port" value={String(env.port)} />
                  <Row label="DATABASE_URL" value={env.hasDatabaseUrl ? "set" : "not set"} />
                  <Row label="Auth" value={env.authDisabled ? "Disabled (demo)" : "Enabled"} />
                </tbody>
              </table>
            ) : null}
          </div>

          {/* Features Card */}
          <div style={card}>
            <h3 style={cardTitle}>Available Features</h3>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "0.85rem" }}>
              <li style={{ marginBottom: 6 }}>
                <span style={dot("#16a34a")} /> SEO Analyzer (no DB required)
              </li>
              <li style={{ marginBottom: 6 }}>
                <span style={dot(health?.db === "ok" ? "#16a34a" : "#6b7280")} />
                {" "}Projects {health?.db !== "ok" && <span style={{ color: "#6b7280" }}>(needs DB)</span>}
              </li>
              <li style={{ marginBottom: 6 }}>
                <span style={dot(health?.db === "ok" ? "#16a34a" : "#6b7280")} />
                {" "}Site Crawler {health?.db !== "ok" && <span style={{ color: "#6b7280" }}>(needs DB)</span>}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <button onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "3px 12px 3px 0", fontWeight: 600, color: "#374151" }}>{label}</td>
      <td style={{ padding: "3px 0", color: "#6b7280" }}>{value}</td>
    </tr>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  padding: "1.25rem",
};

const cardTitle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 600,
  marginBottom: "0.75rem",
  color: "#111827",
};
