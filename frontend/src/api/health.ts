import { api } from "./client";

export interface HealthResponse {
  status: string;
  db: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>("/api/health");
}
