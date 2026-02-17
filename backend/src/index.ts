import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// --------------- Middleware ---------------

app.use(helmet());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json());

app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : "*",
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// --------------- Routes ---------------

app.use("/api", routes);

// --------------- Error handling ---------------

app.use(errorHandler);

// --------------- Start ---------------

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${env.port} [${env.nodeEnv}]`);
});
