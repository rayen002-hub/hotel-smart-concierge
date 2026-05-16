import { Request, Response, NextFunction } from "express";
import { CheckinService } from "../services/checkin.service";

const checkinService = new CheckinService();

/**
 * POST /api/public/checkin/lookup
 */
export const lookupReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await checkinService.lookup(req.body.reservationNumber);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/checkin/submit
 */
export const submitCheckin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await checkinService.submit(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
