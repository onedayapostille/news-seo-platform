import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.VAR_1 || process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
