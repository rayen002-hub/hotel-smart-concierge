import { Router, Request, Response } from "express";
import axios from "axios";
import { env } from "../config/env";

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

/**
 * GET /api/health/ai
 * Verifier que le service IA (Hugging Face) est joignable.
 * Ne retourne aucun secret.
 */
router.get("/health/ai", async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${env.AI_SERVICE_URL}/health`, {
      timeout: 10000,
    });

    res.status(200).json({
      status: "ok",
      ai_service: "reachable",
      ai_status: response.data?.status || "unknown",
      classifier_loaded: response.data?.classifier_loaded ?? null,
      translation_model_loaded: response.data?.translation_model_loaded ?? null,
    });
  } catch (error: any) {
    res.status(503).json({
      status: "degraded",
      ai_service: "unreachable",
      error: error.message || "Cannot reach AI service",
    });
  }
});

export default router;
