import { prisma } from "../prisma";

export interface HealthStatus {
  status: string;
  db: string;
}

export async function healthCheck(): Promise<HealthStatus> {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", db: "ok" };
}
