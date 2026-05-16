import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ReservationService } from "../services/reservation.service";
import { ReservationStatus } from "@prisma/client";

const reservationService = new ReservationService();

/**
 * GET /api/reservations
 */
export const listReservations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ReservationStatus | undefined;
    const roomId = req.query.roomId as string | undefined;

    const result = await reservationService.list({ page, limit, status, roomId });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reservations
 */
export const createReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reservation = await reservationService.create(req.body, req.userId as string);
    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reservations/:id
 */
export const updateReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reservation = await reservationService.update(req.params.id as string, req.body, req.userId as string);
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reservations/:id
 */
export const deleteReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await reservationService.delete(req.params.id as string, req.userId as string);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
