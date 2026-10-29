import { Router } from "express";
import { body } from "express-validator";
import {
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  getReservationGuestForms,
  receptionAssistedCheckin,
} from "../controllers/reservation.controller";
import { generateClientRoomLink } from "../controllers/qr.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// Toutes les routes reservations necessitent auth + ADMIN ou RECEPTIONIST
router.use(authMiddleware, requireRole(UserRole.RECEPTIONIST));

/**
 * GET /api/reservations
 */
router.get("/", listReservations);

/**
 * POST /api/reservations
 */
router.post(
  "/",
  [
    body("reservationNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Numero de reservation requis."),
    body("guestFirstName")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Prenom du client requis."),
    body("guestLastName")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Nom du client requis."),
    body("guestEmail")
      .optional()
      .isEmail()
      .withMessage("Email invalide."),
    body("guestPhone")
      .optional()
      .isString(),
    body("nationality")
      .optional()
      .isString(),
    body("checkInDate")
      .isISO8601()
      .withMessage("Date de checkin invalide (format ISO 8601)."),
    body("checkOutDate")
      .isISO8601()
      .withMessage("Date de checkout invalide (format ISO 8601)."),
    body("roomId")
      .optional()
      .isUUID()
      .withMessage("ID de chambre invalide."),
    body("adultsCount")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Le nombre d'adultes doit être un entier supérieur ou égal à 1."),
    body("childrenCount")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Le nombre d'enfants doit être un entier supérieur ou égal à 0."),
  ],
  validateRequest,
  createReservation
);

/** Reception-assisted check-in uses the same traveler workflow as the QR route. */
router.post(
  "/:id/check-in",
  [
    body("travelerIndex").isInt({ min: 1 }).withMessage("Index voyageur invalide."),
    body("travelerType").isIn(["ADULT", "CHILD"]).withMessage("Type de voyageur invalide."),
    body("fullName").isString().trim().isLength({ min: 2 }).withMessage("Nom complet requis."),
    body("nationality").isString().trim().notEmpty().withMessage("Nationalité requise."),
    body("passportNumber").optional().isString().trim().notEmpty(),
    body("phone").optional().isString(),
    body("address").optional().isString(),
  ],
  validateRequest,
  receptionAssistedCheckin
);

/**
 * PATCH /api/reservations/:id
 */
router.patch(
  "/:id",
  [
    body("guestFirstName")
      .optional()
      .isString()
      .trim()
      .notEmpty(),
    body("guestLastName")
      .optional()
      .isString()
      .trim()
      .notEmpty(),
    body("guestEmail")
      .optional()
      .isEmail()
      .withMessage("Email invalide."),
    body("guestPhone")
      .optional()
      .isString(),
    body("nationality")
      .optional()
      .isString(),
    body("checkInDate")
      .optional()
      .isISO8601()
      .withMessage("Date de checkin invalide."),
    body("checkOutDate")
      .optional()
      .isISO8601()
      .withMessage("Date de checkout invalide."),
    body("status")
      .optional()
      .isIn(["CANCELLED"])
      .withMessage("Seule l'annulation manuelle est autorisée depuis cette route."),
    body("roomId")
      .optional()
      .isUUID()
      .withMessage("ID de chambre invalide."),
  ],
  validateRequest,
  updateReservation
);

/**
 * DELETE /api/reservations/:id
 */
router.delete("/:id", deleteReservation);

/**
 * GET /api/reservations/:id/guest-forms
 * Recuperer les fiches voyageurs soumises d'une reservation (pour la reception).
 * Le numero de passeport est dechiffre et renvoye masque partiellement.
 */
router.get("/:id/guest-forms", getReservationGuestForms);

/**
 * POST /api/reservations/:id/client-room-link
 * Generer un lien d'acces PWA pour le client.
 */
router.post("/:id/client-room-link", generateClientRoomLink);

export default router;
