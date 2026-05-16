import { Router } from "express";
import { body } from "express-validator";
import { createPublicComplaint } from "../controllers/complaint.controller";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

/**
 * POST /api/public/complaints
 * Creer une reclamation (pas d'auth, token chambre dans header).
 */
router.post(
  "/",
  [
    body("message")
      .isString()
      .trim()
      .isLength({ min: 2, max: 1000 })
      .withMessage("Le message doit contenir entre 2 et 1000 caracteres."),
  ],
  validateRequest,
  createPublicComplaint
);

export default router;
