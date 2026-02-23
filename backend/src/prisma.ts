import { PrismaClient } from "@prisma/client";
import { env } from "./config/env";

let prisma: PrismaClient | null = null;
let dbAvailable = false;

function getClient(): PrismaClient {
  if (!prisma) {
    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }
    prisma = new PrismaClient({
      datasources: { db: { url: env.databaseUrl } },
    });
  }
  return prisma;
}

export function hasDatabase(): boolean {
  return !!env.databaseUrl;
}

export function isDbAvailable(): boolean {
  return dbAvailable;
}

export async function checkDb(): Promise<boolean> {
  if (!env.databaseUrl) {
    dbAvailable = false;
    return false;
  }
  try {
    await getClient().$queryRaw`SELECT 1`;
    dbAvailable = true;
    return true;
  } catch {
    dbAvailable = false;
    return false;
  }
}

export function getPrisma(): PrismaClient {
  return getClient();
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
const dbUrl = process.env.VAR_1 || process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
