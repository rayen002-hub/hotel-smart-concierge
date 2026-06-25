import { Router } from "express";
import { body } from "express-validator";
import { listRooms, createRoom, updateRoom, deleteRoom } from "../controllers/room.controller";
import { generateWorkerQr, regenerateWorkerQr } from "../controllers/qr.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

/**
 * GET /api/rooms  (read-only for all staff roles)
 */
router.get(
  "/",
  authMiddleware,
  requireRole(
    UserRole.RECEPTIONIST,
    UserRole.MAINTENANCE_MANAGER,
    UserRole.HOUSEKEEPING_MANAGER
  ),
  listRooms
);


/**
 * POST /api/rooms
 */
router.post(
  "/",
  authMiddleware,
  requireRole(UserRole.RECEPTIONIST),
  [
    body("roomNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de chambre requis."),
    body("floor")
      .isInt({ min: 0 })
      .withMessage("Etage requis (entier positif)."),
    body("type")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Type de chambre requis."),
    body("status")
      .optional()
      .isIn(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"])
      .withMessage("Statut invalide."),
  ],
  validateRequest,
  createRoom
);

/**
 * PATCH /api/rooms/:id
 */
router.patch(
  "/:id",
  authMiddleware,
  requireRole(UserRole.RECEPTIONIST),
  [
    body("roomNumber")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de chambre invalide."),
    body("floor")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Etage invalide."),
    body("type")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Type invalide."),
    body("status")
      .optional()
      .isIn(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"])
      .withMessage("Statut invalide."),
  ],
  validateRequest,
  updateRoom
);

/**
 * DELETE /api/rooms/:id
 */
router.delete("/:id", authMiddleware, requireRole(UserRole.RECEPTIONIST), deleteRoom);

/**
 * POST /api/rooms/:id/worker-qr
 * Generer un QR code pour le scan employe.
 */
router.post("/:id/worker-qr", authMiddleware, requireRole(UserRole.RECEPTIONIST), generateWorkerQr);

/**
 * POST /api/rooms/:id/regenerate-worker-qr
 * Regenerer le QR employe (invalide l'ancien).
 */
router.post("/:id/regenerate-worker-qr", authMiddleware, requireRole(UserRole.RECEPTIONIST), regenerateWorkerQr);

export default router;
