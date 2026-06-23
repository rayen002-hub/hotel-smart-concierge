import { Router } from "express";
import { body } from "express-validator";
import {
  listOccupiedRooms,
  createHousekeepingTask,
  listHousekeepingTasks,
  startHousekeepingTask,
  finishHousekeepingTask,
} from "../controllers/housekeeping.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// Auth requise pour toutes les routes
router.use(authMiddleware);

/**
 * GET /api/housekeeping/occupied-rooms
 * Lister les chambres occupees avec tache active.
 * ADMIN ou HOUSEKEEPING_MANAGER uniquement.
 */
router.get(
  "/occupied-rooms",
  requireRole(UserRole.HOUSEKEEPING_MANAGER),
  listOccupiedRooms
);

/**
 * POST /api/housekeeping/tasks
 * Creer une tache housekeeping.
 * ADMIN ou HOUSEKEEPING_MANAGER uniquement.
 */
router.post(
  "/tasks",
  requireRole(UserRole.HOUSEKEEPING_MANAGER),
  [
    body("roomId")
      .isUUID()
      .withMessage("L'identifiant de la chambre doit etre un UUID valide."),
    body("reservationId")
      .optional()
      .isUUID()
      .withMessage("L'identifiant de la reservation doit etre un UUID valide."),
    body("assignedToId")
      .isUUID()
      .withMessage("L'identifiant de l'employe doit etre un UUID valide."),
    body("note")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("La note ne doit pas depasser 1000 caracteres."),
  ],
  validateRequest,
  createHousekeepingTask
);

/**
 * GET /api/housekeeping/tasks
 * Lister les taches housekeeping.
 * ADMIN, HOUSEKEEPING_MANAGER, ou EMPLOYEE.
 */
router.get(
  "/tasks",
  requireRole(UserRole.HOUSEKEEPING_MANAGER, UserRole.EMPLOYEE),
  listHousekeepingTasks
);

/**
 * POST /api/housekeeping/tasks/:id/start
 * Demarrer une tache (scan entree chambre).
 * EMPLOYEE uniquement (verifie assignation dans le service).
 */
router.post(
  "/tasks/:id/start",
  requireRole(UserRole.EMPLOYEE),
  [
    body("workerRoomQrToken")
      .isString()
      .notEmpty()
      .withMessage("Le token QR de la chambre est requis."),
  ],
  validateRequest,
  startHousekeepingTask
);

/**
 * POST /api/housekeeping/tasks/:id/finish
 * Terminer une tache (scan sortie chambre).
 * EMPLOYEE uniquement (verifie assignation dans le service).
 */
router.post(
  "/tasks/:id/finish",
  requireRole(UserRole.EMPLOYEE),
  [
    body("workerRoomQrToken")
      .isString()
      .notEmpty()
      .withMessage("Le token QR de la chambre est requis."),
    body("result")
      .isString()
      .isIn(["DONE", "NOT_DONE"])
      .withMessage("Le resultat doit etre 'DONE' ou 'NOT_DONE'."),
    body("workerComment")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Le commentaire ne doit pas depasser 1000 caracteres."),
  ],
  validateRequest,
  finishHousekeepingTask
);

export default router;
