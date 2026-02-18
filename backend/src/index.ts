import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./prisma";

const app = express();

// --------------- Middleware ---------------

app.use(helmet());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// --------------- Health check (root) ---------------

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/db-check", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: "ok" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    res.json({ db: "error", message });
  }
});

// --------------- Routes ---------------

app.use("/api", routes);

// --------------- Error handling ---------------

app.use(errorHandler);

// --------------- Start ---------------

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${env.port} [${env.nodeEnv}]`);
});

// --------------- Graceful shutdown ---------------

function shutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Connections closed — exiting");
    process.exit(0);
  });
  // Force exit after 10s if connections don't drain
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
