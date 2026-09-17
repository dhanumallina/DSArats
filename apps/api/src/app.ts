import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config, isProduction } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authLimiter, generalLimiter } from "./middleware/rateLimit";
import achievementsRouter from "./routes/achievements";
import adminRouter from "./routes/admin";
import analyticsRouter from "./routes/analytics";
import authRouter from "./routes/auth";
import dailyChallengeRouter from "./routes/dailyChallenge";
import dashboardRouter from "./routes/dashboard";
import healthRouter from "./routes/health";
import problemsRouter from "./routes/problems";
import progressRouter from "./routes/progress";
import revisionRouter from "./routes/revision";
import sheetsRouter from "./routes/sheets";
import streakRouter from "./routes/streak";
import topicsRouter from "./routes/topics";
import usersRouter from "./routes/users";
import xpRouter from "./routes/xp";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Behind a single proxy (Render), trust the immediate hop so req.ip reflects the
  // client and per-IP rate limiting actually keys off real IPs.
  app.set("trust proxy", isProduction ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Rate limiting (skipped in test env). The strict auth limiter applies only to
  // credential-guessing endpoints — /auth/me and /auth/refresh get the general limit
  // so legitimate dashboard usage is never throttled (plan §5.13).
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/register", authLimiter);
  app.use("/api/v1", generalLimiter);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/sheets", sheetsRouter);
  app.use("/api/v1/topics", topicsRouter);
  app.use("/api/v1/problems", problemsRouter);
  app.use("/api/v1/daily-challenge", dailyChallengeRouter);
  app.use("/api/v1/progress", progressRouter);
  app.use("/api/v1/streak", streakRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/revision", revisionRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/xp", xpRouter);
  app.use("/api/v1/achievements", achievementsRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api", healthRouter);

  // 404 + central error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}