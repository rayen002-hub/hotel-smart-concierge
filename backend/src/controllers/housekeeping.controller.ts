import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HousekeepingService } from "../services/housekeeping.service";
import { HousekeepingTaskStatus, HousekeepingTaskResult, UserRole } from "@prisma/client";
import { getIO } from "../socket/socket";

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

    // Notify via Socket.IO
    try {
      const io = getIO();
      io.emit("housekeepingTaskCreated", { task });
    } catch { /* socket not initialized */ }

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

/**
 * POST /api/housekeeping/tasks/:id/start
 * Demarrer une tache (scan entree chambre).
 */
export const startHousekeepingTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id as string;
    const employeeId = req.userId as string;
    const { workerRoomQrToken } = req.body;

    const task = await housekeepingService.startTask({
      taskId,
      employeeId,
      workerRoomQrToken,
    });

    // Notify via Socket.IO
    try {
      const io = getIO();
      io.emit("housekeepingTaskStarted", { task });
    } catch { /* socket not initialized */ }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/housekeeping/tasks/:id/finish
 * Terminer une tache (scan sortie chambre).
 */
export const finishHousekeepingTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id as string;
    const employeeId = req.userId as string;
    const { workerRoomQrToken, result, workerComment } = req.body;

    const { task: updatedTask, newStatus } = await housekeepingService.finishTask({
      taskId,
      employeeId,
      workerRoomQrToken,
      result: result as HousekeepingTaskResult,
      workerComment,
    });

    // Notify via Socket.IO
    try {
      const io = getIO();
      const eventName =
        newStatus === HousekeepingTaskStatus.COMPLETED
          ? "housekeepingTaskCompleted"
          : "housekeepingTaskNeedsReview";
      io.emit(eventName, { task: updatedTask });
    } catch { /* socket not initialized */ }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};
