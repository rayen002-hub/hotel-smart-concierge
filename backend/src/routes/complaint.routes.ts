import { Router } from "express";
import { body } from "express-validator";
import {
  createPublicComplaint,
  listPublicComplaints,
  confirmPublicComplaint,
  reopenPublicComplaint,
} from "../controllers/complaint.controller";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

/**
 * GET /api/public/complaints
 * Lister les reclamations du client.
 */
router.get("/", listPublicComplaints);

/**
 * POST /api/public/complaints
 * Creer une reclamation.
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

/**
 * POST /api/public/complaints/:id/confirm
 * Confirmer une reclamation resolue.
 */
router.post("/:id/confirm", confirmPublicComplaint);

/**
 * POST /api/public/complaints/:id/reopen
 * Reouvrir une reclamation resolue.
 */
router.post(
  "/:id/reopen",
  [
    body("comment")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Le commentaire ne doit pas depasser 1000 caracteres."),
  ],
  validateRequest,
  reopenPublicComplaint
);

export default router;
