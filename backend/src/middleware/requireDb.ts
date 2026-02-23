import { Request, Response, NextFunction } from "express";
import { hasDatabase, isDbAvailable } from "../prisma";

export function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (!hasDatabase()) {
    res.status(503).json({
      error: "db_unavailable",
      message: "Database is not configured. Set DATABASE_URL to enable this feature.",
    });
    return;
  }
  if (!isDbAvailable()) {
    res.status(503).json({
      error: "db_unavailable",
      message: "Database is not connected yet.",
    });
    return;
  }
  next();
}
