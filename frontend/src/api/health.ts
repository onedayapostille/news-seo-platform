export interface HealthResponse {
  status: string;
  db: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
