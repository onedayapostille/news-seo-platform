import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    api.get<Project[]>("/api/projects").then(setProjects).catch(console.error);
  };

  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/projects", { name, domain });
      setName("");
      setDomain("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Projects</h2>

      <form onSubmit={create} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Domain (e.g. example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Project"}
        </button>
      </form>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {projects.length === 0 && <p>No projects yet. Create one above.</p>}

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>{p.name}</td>
              <td style={tdStyle}>{p.domain}</td>
              <td style={tdStyle}>{new Date(p.createdAt).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => navigate(`/analyze?projectId=${p.id}`)}>
                    Analyze URL
                  </button>
                  <button onClick={() => navigate(`/crawler?projectId=${p.id}`)} style={{ backgroundColor: "#059669" }}>
                    Crawl Site
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 1rem",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderBottom: "1px solid #e5e7eb",
};
