import { Router } from "express";
import { body } from "express-validator";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  listOnlineEmployees,
} from "../controllers/employee.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// Auth requise pour toutes les routes
router.use(authMiddleware);

/**
 * GET /api/employees/online
 * Doit etre avant /:id pour eviter un conflit de route.
 */
router.get(
  "/online",
  requireRole(
    UserRole.RECEPTIONIST,
    UserRole.MAINTENANCE_MANAGER,
    UserRole.HOUSEKEEPING_MANAGER
  ),
  listOnlineEmployees
);

/**
 * GET /api/employees
 */
router.get(
  "/",
  requireRole(
    UserRole.RECEPTIONIST,
    UserRole.MAINTENANCE_MANAGER,
    UserRole.HOUSEKEEPING_MANAGER
  ),
  listEmployees
);

/**
 * POST /api/employees
 * RECEPTIONIST exclu de la creation.
 */
router.post(
  "/",
  requireRole(UserRole.MAINTENANCE_MANAGER, UserRole.HOUSEKEEPING_MANAGER),
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Nom requis (min 2 caracteres)."),
    body("email")
      .isEmail()
      .withMessage("Email invalide.")
      .normalizeEmail(),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Mot de passe requis (min 6 caracteres)."),
    body("department")
      .isString()
      .isIn(["MAINTENANCE", "HOUSEKEEPING", "RECEPTION", "RESTAURANT", "GENERAL"])
      .withMessage("Departement invalide."),
  ],
  validateRequest,
  createEmployee
);

/**
 * PATCH /api/employees/:id
 * RECEPTIONIST exclu de la modification.
 */
router.patch(
  "/:id",
  requireRole(UserRole.MAINTENANCE_MANAGER, UserRole.HOUSEKEEPING_MANAGER),
  [
    body("isAvailable")
      .optional()
      .isBoolean()
      .withMessage("isAvailable doit etre un booleen."),
    body("department")
      .optional()
      .isString()
      .isIn(["MAINTENANCE", "HOUSEKEEPING", "RECEPTION", "RESTAURANT", "GENERAL"])
      .withMessage("Departement invalide."),
  ],
  validateRequest,
  updateEmployee
);

export default router;
