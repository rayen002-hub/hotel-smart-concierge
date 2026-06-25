import { Router } from "express";
import { body } from "express-validator";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeactivateUser,
  adminReactivateUser,
} from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// All admin routes require auth + ADMIN role
router.use(authMiddleware, requireRole(UserRole.ADMIN));

/**
 * GET /api/admin/users
 * Query: search, role, department, isActive, page, limit
 */
router.get("/users", adminListUsers);

/**
 * POST /api/admin/users
 */
router.post(
  "/users",
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Nom requis (min 2 caractères)."),
    body("email")
      .isEmail()
      .withMessage("Email invalide.")
      .normalizeEmail(),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Mot de passe requis (min 6 caractères)."),
    body("role")
      .isIn(Object.values(UserRole))
      .withMessage("Rôle invalide."),
    body("department")
      .optional()
      .isIn(["RECEPTION", "MAINTENANCE", "HOUSEKEEPING", "RESTAURANT", "GENERAL"])
      .withMessage("Département invalide."),
  ],
  validateRequest,
  adminCreateUser
);

/**
 * PATCH /api/admin/users/:id
 */
router.patch(
  "/users/:id",
  [
    body("name").optional().isString().trim().isLength({ min: 2 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("password").optional().isString().isLength({ min: 6 }),
    body("role").optional().isIn(Object.values(UserRole)),
    body("department")
      .optional()
      .isIn(["RECEPTION", "MAINTENANCE", "HOUSEKEEPING", "RESTAURANT", "GENERAL"]),
    body("isAvailable").optional().isBoolean(),
  ],
  validateRequest,
  adminUpdateUser
);

/**
 * PATCH /api/admin/users/:id/deactivate
 */
router.patch("/users/:id/deactivate", adminDeactivateUser);

/**
 * PATCH /api/admin/users/:id/reactivate
 */
router.patch("/users/:id/reactivate", adminReactivateUser);

export default router;
