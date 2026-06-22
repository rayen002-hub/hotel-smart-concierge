import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { env } from "../config/env";
import { generateCheckinToken } from "../services/checkinToken.service";

const router = Router();

/**
 * POST /api/checkin-qr
 * Genere un token securise et retourne l'URL de check-in avec token.
 * Acces : ADMIN ou RECEPTIONIST.
 */
router.post(
  "/",
  authMiddleware,
  requireRole("RECEPTIONIST"),
  (_req: Request, res: Response) => {
    const token = generateCheckinToken();
    const checkinUrl = `${env.FRONTEND_URL}/checkin?token=${token}`;

    res.status(200).json({
      success: true,
      data: { url: checkinUrl },
    });
  }
);

export default router;
