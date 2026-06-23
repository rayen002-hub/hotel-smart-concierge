import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import roomRoutes from "./room.routes";
import reservationRoutes from "./reservation.routes";
import staffComplaintRoutes from "./staffComplaint.routes";
import mobileRoutes from "./mobile.routes";
import employeeRoutes from "./employee.routes";
import hotelRoutes from "./hotel.routes";
import checkinRoutes from "./checkin.routes";
import complaintRoutes from "./complaint.routes";
import hotelPublicRoutes from "./hotelPublic.routes";
import checkinQrRoutes from "./checkinQr.routes";
import guestMessageRoutes from "./guestMessage.routes";
import staffGuestMessageRoutes from "./staffGuestMessage.routes";
import eventRoutes from "./event.routes";
import eventPublicRoutes from "./eventPublic.routes";
import housekeepingRoutes from "./housekeeping.routes";

import rateLimit from "express-rate-limit";

const router = Router();

// Enregistrer les routes
router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/reservations", reservationRoutes);
router.use("/complaints", staffComplaintRoutes);
router.use("/employees", employeeRoutes);
router.use("/mobile", mobileRoutes);
router.use("/", hotelRoutes); // Provides /hotel-info and /currency-rates
router.use("/checkin-qr", checkinQrRoutes);
router.use("/guest-messages", staffGuestMessageRoutes);
router.use("/events", eventRoutes);
router.use("/housekeeping", housekeepingRoutes);

// Rate limiting strict pour les routes publiques
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limite plus stricte pour le public (30 requetes / 15 min)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de requetes sur les services publics. Veuillez patienter.",
  },
});

// Routes publiques (pas d'auth)
router.use("/public/checkin", publicLimiter, checkinRoutes);
router.use("/public/complaints", publicLimiter, complaintRoutes);
router.use("/public/messages", publicLimiter, guestMessageRoutes);
router.use("/public/events", publicLimiter, eventPublicRoutes);
router.use("/public", publicLimiter, hotelPublicRoutes);

export default router;
