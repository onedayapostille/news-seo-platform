import { hasDatabase, checkDb } from "../prisma";

export interface HealthStatus {
  status: string;
  db: string;
  reason?: string;
}

export async function healthCheck(): Promise<HealthStatus> {
  if (!hasDatabase()) {
    return { status: "ok", db: "skipped", reason: "DATABASE_URL not set" };
  }
  const ok = await checkDb();
  return ok
    ? { status: "ok", db: "ok" }
    : { status: "ok", db: "error" };
}
