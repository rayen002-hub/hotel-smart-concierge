import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/health
 * Verifier que le backend est operationnel.
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});

export default router;
