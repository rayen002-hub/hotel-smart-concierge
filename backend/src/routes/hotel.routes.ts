import { Router } from "express";
import { body } from "express-validator";
import {
  updateStaffHotelInfo,
  updateStaffCurrencyRate,
} from "../controllers/hotel.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

const hotelStaffMiddleware = [
  authMiddleware,
  requireRole(UserRole.RECEPTIONIST), // ADMIN is automatically allowed
];

/**
 * PATCH /api/hotel-info/:id
 */
router.patch(
  "/hotel-info/:id",
  hotelStaffMiddleware,
  [
    body("title").optional().isString().trim(),
    body("content").optional().isString().trim(),
    body("type").optional().isString().trim(),
  ],
  validateRequest,
  updateStaffHotelInfo
);

/**
 * PATCH /api/currency-rates/:id
 */
router.patch(
  "/currency-rates/:id",
  hotelStaffMiddleware,
  [
    body("rateToTnd")
      .isNumeric()
      .withMessage("Le taux doit etre un nombre valide."),
  ],
  validateRequest,
  updateStaffCurrencyRate
);

export default router;
