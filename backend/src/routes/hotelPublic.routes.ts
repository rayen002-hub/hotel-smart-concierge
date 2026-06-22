import { Router, Request, Response, NextFunction } from "express";
import {
  getPublicHotelInfo,
} from "../controllers/hotel.controller";
import { CurrencyService } from "../services/currency.service";

const router = Router();
const currencyService = new CurrencyService();

/**
 * GET /api/public/hotel-info
 */
router.get("/hotel-info", getPublicHotelInfo);

/**
 * GET /api/public/currency-rates
 * Retourne les taux depuis l'API externe (avec cache 6h + fallback DB).
 */
router.get("/currency-rates", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await currencyService.getLatestRates();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/currency-convert?from=EUR&to=TND&amount=100
 * Convertit un montant d'une devise vers une autre.
 */
router.get("/currency-convert", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const amountStr = (req.query.amount as string) || "";

    if (!from || !to || !amountStr) {
      res.status(400).json({
        success: false,
        error: "Parametres requis : from, to, amount.",
      });
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        error: "Le montant doit etre un nombre positif.",
      });
      return;
    }

    const result = await currencyService.convert(from, to, amount);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
