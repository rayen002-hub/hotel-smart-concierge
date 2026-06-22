import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { lookupReservation, submitCheckin } from "../controllers/checkin.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { verifyCheckinToken } from "../services/checkinToken.service";

const router = Router();

/**
 * Middleware pour verifier le token de check-in (X-Checkin-Token).
 */
const requireCheckinToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["x-checkin-token"] as string;

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Token de check-in manquant (header X-Checkin-Token). Veuillez scanner le QR code a la reception.",
    });
    return;
  }

  try {
    verifyCheckinToken(token);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 401).json({
      success: false,
      error: error.message || "Token de check-in invalide.",
    });
  }
};

// Toutes les routes de check-in requirent le token
router.use(requireCheckinToken);

/**
 * POST /api/public/checkin/lookup
 * Rechercher une reservation par numero.
 */
router.post(
  "/lookup",
  [
    body("reservationNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de reservation requis."),
  ],
  validateRequest,
  lookupReservation
);

/**
 * POST /api/public/checkin/submit
 * Soumettre le formulaire de check-in.
 */
router.post(
  "/submit",
  [
    body("reservationNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de reservation requis."),
    body("travelerIndex")
      .isInt({ min: 1 })
      .withMessage("Index voyageur requis (entier >= 1)."),
    body("travelerType")
      .isIn(["ADULT", "CHILD"])
      .withMessage("Type de voyageur invalide (ADULT ou CHILD)."),
    body("fullName")
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Nom complet requis (min 2 caracteres)."),
    body("nationality")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Nationalite requise."),
    body("passportNumber")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de passeport invalide."),
    body("phone")
      .optional()
      .isString(),
    body("address")
      .optional()
      .isString(),
  ],
  validateRequest,
  submitCheckin
);

export default router;
