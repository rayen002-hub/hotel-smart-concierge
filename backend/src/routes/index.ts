import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

// Enregistrer les routes
router.use("/", healthRoutes);

export default router;
