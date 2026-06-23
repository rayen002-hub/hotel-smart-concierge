import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HousekeepingService } from "../services/housekeeping.service";
import { HousekeepingTaskStatus, UserRole } from "@prisma/client";

const housekeepingService = new HousekeepingService();

/**
 * GET /api/housekeeping/occupied-rooms
 * Lister les chambres occupees avec leur tache active.
 */
export const listOccupiedRooms = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rooms = await housekeepingService.listOccupiedRooms();
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/housekeeping/tasks
 * Creer une tache housekeeping.
 */
export const createHousekeepingTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roomId, reservationId, assignedToId, note } = req.body;
    const assignedById = req.userId as string;

    const task = await housekeepingService.createTask({
      roomId,
      reservationId,
      assignedToId,
      assignedById,
      note,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/housekeeping/tasks
 * Lister les taches housekeeping (filtrees par role).
 */
export const listHousekeepingTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const userRole = req.userRole as UserRole;
    const status = req.query.status as HousekeepingTaskStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await housekeepingService.listTasks({
      userId,
      userRole,
      status,
      page,
      limit,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
