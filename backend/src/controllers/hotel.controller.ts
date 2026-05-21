import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HotelService } from "../services/hotel.service";

const hotelService = new HotelService();

// -----------------------------------------------------------
// Public Routes
// -----------------------------------------------------------

/**
 * GET /api/public/hotel-info
 */
export const getPublicHotelInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const infos = await hotelService.getHotelInfos();
    res.status(200).json({ success: true, data: infos });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/currency-rates
 */
export const getPublicCurrencyRates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rates = await hotelService.getCurrencyRates();
    res.status(200).json({ success: true, data: rates });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// Staff Routes
// -----------------------------------------------------------

/**
 * PATCH /api/hotel-info/:id
 */
export const updateStaffHotelInfo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    
    const updated = await hotelService.updateHotelInfo(id, data, req.userId as string);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/currency-rates/:id
 */
export const updateStaffCurrencyRate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rateToTnd } = req.body;
    
    const updated = await hotelService.updateCurrencyRate(id, { rateToTnd }, req.userId as string);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit-logs
 */
export const getStaffAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await hotelService.getAuditLogs();
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
