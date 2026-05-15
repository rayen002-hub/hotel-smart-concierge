import { Router } from "express";
import { body } from "express-validator";
import { login, getMe, logout } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

/**
 * POST /api/auth/login
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Email invalide.")
      .normalizeEmail(),
    body("password")
      .isString()
      .notEmpty()
      .withMessage("Mot de passe requis.")
      .isLength({ min: 6 })
      .withMessage("Le mot de passe doit contenir au moins 6 caracteres."),
  ],
  validateRequest,
  login
);

/**
 * GET /api/auth/me
 */
router.get("/me", authMiddleware, getMe);

/**
 * POST /api/auth/logout
 */
router.post("/logout", authMiddleware, logout);

export default router;
