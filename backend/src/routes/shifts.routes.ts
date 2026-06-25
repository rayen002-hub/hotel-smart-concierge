import { Router } from "express";
import { body, query } from "express-validator";
import { getShifts, upsertShift } from "../controllers/shifts.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole, WorkerShift } from "@prisma/client";

const router = Router();

router.use(authMiddleware, requireRole(UserRole.HOUSEKEEPING_MANAGER, UserRole.MAINTENANCE_MANAGER));

/**
 * GET /api/shifts
 * Query: ?businessDay=YYYY-MM-DD (optional, defaults to today's business day)
 */
router.get(
  "/",
  [
    query("businessDay")
      .optional()
      .isISO8601()
      .withMessage("businessDay doit être une date ISO (YYYY-MM-DD)."),
  ],
  validateRequest,
  getShifts
);

/**
 * PUT /api/shifts
 * Body: { workerId, shift, businessDay? }
 */
router.put(
  "/",
  [
    body("workerId").isUUID().withMessage("workerId doit être un UUID valide."),
    body("shift")
      .isIn(Object.values(WorkerShift))
      .withMessage(`shift doit être l'une des valeurs: ${Object.values(WorkerShift).join(", ")}`),
    body("businessDay")
      .optional()
      .isISO8601()
      .withMessage("businessDay doit être une date ISO (YYYY-MM-DD)."),
  ],
  validateRequest,
  upsertShift
);

export default router;
