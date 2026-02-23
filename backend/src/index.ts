import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { checkDb, disconnectPrisma, hasDatabase } from "./prisma";

const app = express();

// Trust reverse proxy (Dublyo, nginx, etc.)
app.set("trust proxy", 1);

// --------------- Middleware ---------------

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
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

// --------------- API routes ---------------

app.use("/api", routes);

// --------------- Error handling ---------------

app.use(errorHandler);

// --------------- Serve frontend (production) ---------------

const frontendDir = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDir));
app.get("*", (_req, res, next) => {
  // Only serve index.html for non-API routes
  if (_req.path.startsWith("/api")) return next();
  res.sendFile(path.join(frontendDir, "index.html"), (err) => {
    if (err) {
      // Frontend not built — return a simple JSON response
      res.json({ status: "ok", message: "API is running. Frontend not built yet." });
    }
  });
});

// --------------- Start ---------------

async function start() {
  // Try connecting to DB on startup (non-blocking)
  if (hasDatabase()) {
    const ok = await checkDb();
    console.log(`Database: ${ok ? "connected" : "unreachable (will retry on requests)"}`);
  } else {
    console.log("Database: skipped (DATABASE_URL not set)");
  }

  const server = app.listen(env.port, "0.0.0.0", () => {
    console.log(`Backend listening on port ${env.port} [${env.nodeEnv}]`);
    if (env.authDisabled) console.log("AUTH_DISABLED=true — no login required");
  });

  function shutdown(signal: string) {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectPrisma();
      console.log("Connections closed — exiting");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
