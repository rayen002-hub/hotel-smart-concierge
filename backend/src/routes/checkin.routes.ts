import { Router } from "express";
import { body } from "express-validator";
import { lookupReservation, submitCheckin } from "../controllers/checkin.controller";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

/**
 * POST /api/public/checkin/lookup
 * Rechercher une reservation par numero (pas d'auth requise).
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
 * Soumettre le formulaire de check-in (pas d'auth requise).
 */
router.post(
  "/submit",
  [
    body("reservationNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de reservation requis."),
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
