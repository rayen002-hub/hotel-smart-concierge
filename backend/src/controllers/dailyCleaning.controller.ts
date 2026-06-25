import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { DailyCleaningService } from "../services/dailyCleaning.service";

const svc = new DailyCleaningService();

/** GET /api/housekeeping/daily-tasks */
export const listDailyTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await svc.listTasks({
      businessDay: req.query.businessDay as string | undefined,
      workerId: req.query.workerId as string | undefined,
      status: req.query.status as string | undefined,
      roomId: req.query.roomId as string | undefined,
    });
    res.status(200).json({ success: true, ...result });
  } catch (e) { next(e); }
};

/** POST /api/housekeeping/daily-tasks */
export const createDailyTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, workerId, note, businessDay } = req.body;
    const task = await svc.createTask({
      roomId,
      workerId,
      note,
      assignedById: req.userId as string,
      businessDay,
    });
    res.status(201).json({ success: true, data: task });
  } catch (e) { next(e); }
};

/** PATCH /api/housekeeping/daily-tasks/:id/start */
export const startDailyTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await svc.startTask(req.params.id as string, req.userId as string);
    res.status(200).json({ success: true, data: task });
  } catch (e) { next(e); }
};

/** PATCH /api/housekeeping/daily-tasks/:id/complete */
export const completeDailyTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { done, note } = req.body as { done: boolean; note?: string };
    const task = await svc.completeTask(req.params.id as string, req.userId as string, { done, note });
    res.status(200).json({ success: true, data: task });
  } catch (e) { next(e); }
};

/** DELETE /api/housekeeping/daily-tasks/:id */
export const deleteDailyTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await svc.deleteTask(req.params.id as string);
    res.status(200).json({ success: true, ...result });
  } catch (e) { next(e); }
};

/** GET /api/mobile/daily-cleaning-tasks — worker's daily tasks */
export const listMyDailyTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await svc.listTasks({ workerId: req.userId as string });
    res.status(200).json({ success: true, data: result.data });
  } catch (e) { next(e); }
};
