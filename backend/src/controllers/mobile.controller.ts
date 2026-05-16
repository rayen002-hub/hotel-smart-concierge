import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { EmployeeService } from "../services/employee.service";
import { ComplaintService } from "../services/complaint.service";
import { InterventionResult } from "@prisma/client";
import { AppError } from "../services/auth.service";

const employeeService = new EmployeeService();
const complaintService = new ComplaintService();

/**
 * POST /api/mobile/heartbeat
 */
export const heartbeat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await employeeService.heartbeat(req.userId as string);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mobile/tasks
 */
export const listTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await complaintService.listForEmployee(req.userId as string);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mobile/tasks/:id
 */
export const getTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await complaintService.getById(req.params.id as string);

    // Verifier l'assignation
    if (task.assignedToId !== req.userId) {
      res.status(403).json({
        success: false,
        error: "Cette tache ne vous est pas assignee.",
      });
      return;
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mobile/tasks/:id/scan-entry
 */
export const scanEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workerRoomQrToken } = req.body;

    const log = await complaintService.scanEntry(
      req.params.id as string,
      req.userId as string,
      workerRoomQrToken
    );

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mobile/tasks/:id/scan-exit
 */
export const scanExit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workerRoomQrToken, result, employeeComment } = req.body;

    const updatedTask = await complaintService.scanExit(
      req.params.id as string,
      req.userId as string,
      workerRoomQrToken,
      result as InterventionResult,
      employeeComment
    );

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mobile/tasks/:id/messages
 */
export const getMobileMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintId = req.params.id as string;
    const complaint = await complaintService.getById(complaintId);

    if (complaint.assignedToId !== req.userId) {
      throw new AppError("Cette tache ne vous est pas assignee.", 403);
    }

    const messages = await complaintService.getMessages(complaintId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mobile/tasks/:id/messages
 */
export const addMobileMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintId = req.params.id as string;
    const { message } = req.body;
    
    // AuthRequest guarantees userRole exists
    const userRole = req.userRole!;
    const userId = req.userId as string;

    const complaint = await complaintService.getById(complaintId);

    if (complaint.assignedToId !== userId) {
      throw new AppError("Cette tache ne vous est pas assignee.", 403);
    }

    const newMessage = await complaintService.addMessage(
      complaintId,
      userId,
      userRole,
      message
    );

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};
