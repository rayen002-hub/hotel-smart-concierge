import { Router } from "express";
import { body } from "express-validator";
import {
  listStaffComplaints,
  getStaffComplaint,
  updateStaffComplaintCategory,
  assignStaffComplaint,
} from "../controllers/staffComplaint.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// Auth + roles autorises (EMPLOYEE exclu)
router.use(
  authMiddleware,
  requireRole(
    UserRole.RECEPTIONIST,
    UserRole.MAINTENANCE_MANAGER,
    UserRole.HOUSEKEEPING_MANAGER
  )
);

/**
 * GET /api/complaints
 */
router.get("/", listStaffComplaints);

/**
 * GET /api/complaints/:id
 */
router.get("/:id", getStaffComplaint);

/**
 * PATCH /api/complaints/:id/category
 */
router.patch(
  "/:id/category",
  [
    body("category")
      .isString()
      .isIn([
        "MAINTENANCE",
        "HOUSEKEEPING",
        "RECEPTION",
        "RESTAURANT",
        "COMPLAINT",
        "OTHER",
      ])
      .withMessage("Categorie invalide."),
  ],
  validateRequest,
  updateStaffComplaintCategory
);

/**
 * PATCH /api/complaints/:id/assign
 */
router.patch(
  "/:id/assign",
  [
    body("employeeId")
      .isUUID()
      .withMessage("L'identifiant de l'employe doit etre un UUID valide."),
  ],
  validateRequest,
  assignStaffComplaint
);

export default router;
