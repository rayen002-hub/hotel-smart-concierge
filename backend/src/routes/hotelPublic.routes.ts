import { Router } from "express";
import {
  getPublicHotelInfo,
  getPublicCurrencyRates,
} from "../controllers/hotel.controller";

const router = Router();

/**
 * GET /api/public/hotel-info
 */
router.get("/hotel-info", getPublicHotelInfo);

/**
 * GET /api/public/currency-rates
 */
router.get("/currency-rates", getPublicCurrencyRates);

export default router;
