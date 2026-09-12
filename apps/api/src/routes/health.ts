import { Router } from "express";
import { sendOk } from "../utils/response";

const router = Router();

/** GET /health — liveness + DB connectivity. */
router.get("/health", async (_req, res) => {
  const { prisma } = await import("../db");
  await prisma.$queryRaw`SELECT 1`;
  sendOk(res, { status: "ok", service: "dsarats-api" });
});

export default router;