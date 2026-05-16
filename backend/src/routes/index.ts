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

// Routes publiques (pas d'auth)
router.use("/public/checkin", checkinRoutes);
router.use("/public/complaints", complaintRoutes);
router.use("/public", hotelPublicRoutes);

export default router;
