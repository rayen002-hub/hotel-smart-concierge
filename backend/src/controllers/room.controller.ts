import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { RoomService } from "../services/room.service";
import { RoomStatus } from "@prisma/client";

const roomService = new RoomService();

/**
 * GET /api/rooms
 */
export const listRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as RoomStatus | undefined;
    const floor = req.query.floor ? parseInt(req.query.floor as string) : undefined;

    const result = await roomService.list({ page, limit, status, floor });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rooms
 */
export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await roomService.create(req.body, req.userId as string);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/rooms/:id
 */
export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await roomService.update(req.params.id as string, req.body, req.userId as string);
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rooms/:id
 */
export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await roomService.delete(req.params.id as string, req.userId as string);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
