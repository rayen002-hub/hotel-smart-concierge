import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import roomRoutes from "./room.routes";
import reservationRoutes from "./reservation.routes";

const router = Router();

// Enregistrer les routes
router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/reservations", reservationRoutes);

export default router;
