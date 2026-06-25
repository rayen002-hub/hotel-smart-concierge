import prisma from "../config/prisma";
import { DailyCleaningStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { getBusinessDay, parseBusinessDay, formatBusinessDay } from "../utils/businessDay";
import { createAuditLog } from "../utils/audit";

const taskInclude = {
  room: { select: { id: true, roomNumber: true, floor: true, type: true, status: true } },
  worker: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, name: true } },
} as const;

export class DailyCleaningService {
  /**
   * List daily cleaning tasks for a given business day.
   * If workerId is provided, filter to that worker only.
   */
  async listTasks(params: {
    businessDay?: string;
    workerId?: string;
    status?: string;
    roomId?: string;
  }) {
    const day = parseBusinessDay(params.businessDay);

    const where: any = { businessDay: day };
    if (params.workerId) where.workerId = params.workerId;
    if (params.status) where.status = params.status;
    if (params.roomId) where.roomId = params.roomId;

    const tasks = await prisma.dailyCleaningTask.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    return { businessDay: formatBusinessDay(day), data: tasks };
  }

  /**
   * Create a daily cleaning task (manager assigns room to worker).
   */
  async createTask(params: {
    roomId: string;
    workerId: string;
    note?: string;
    assignedById: string;
    businessDay?: string;
  }) {
    const day = parseBusinessDay(params.businessDay);

    // Verify room exists
    const room = await prisma.room.findUnique({ where: { id: params.roomId } });
    if (!room) throw new AppError("Chambre introuvable.", 404);

    // Verify worker exists
    const worker = await prisma.user.findUnique({ where: { id: params.workerId } });
    if (!worker) throw new AppError("Employé introuvable.", 404);

    const task = await prisma.dailyCleaningTask.create({
      data: {
        roomId: params.roomId,
        workerId: params.workerId,
        businessDay: day,
        note: params.note ?? null,
        assignedById: params.assignedById,
        status: DailyCleaningStatus.ASSIGNED,
      },
      include: taskInclude,
    });

    await createAuditLog({
      actorId: params.assignedById,
      action: "CREATE_DAILY_CLEANING",
      entity: "DailyCleaningTask",
      entityId: task.id,
      metadata: {
        roomNumber: room.roomNumber,
        workerName: worker.name,
        businessDay: formatBusinessDay(day),
      },
    });

    return task;
  }

  /**
   * Worker starts a daily cleaning task.
   */
  async startTask(taskId: string, workerId: string) {
    const task = await prisma.dailyCleaningTask.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Tâche introuvable.", 404);
    if (task.workerId !== workerId) throw new AppError("Cette tâche ne vous est pas assignée.", 403);
    if (task.status !== DailyCleaningStatus.ASSIGNED) {
      throw new AppError(`Impossible de démarrer une tâche en statut ${task.status}.`, 400);
    }

    return prisma.dailyCleaningTask.update({
      where: { id: taskId },
      data: {
        status: DailyCleaningStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: taskInclude,
    });
  }

  /**
   * Worker completes a daily cleaning task.
   */
  async completeTask(taskId: string, workerId: string, params: { note?: string; done: boolean }) {
    const task = await prisma.dailyCleaningTask.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Tâche introuvable.", 404);
    if (task.workerId !== workerId) throw new AppError("Cette tâche ne vous est pas assignée.", 403);
    if (
      task.status !== DailyCleaningStatus.ASSIGNED &&
      task.status !== DailyCleaningStatus.IN_PROGRESS
    ) {
      throw new AppError(`Impossible de terminer une tâche en statut ${task.status}.`, 400);
    }

    const newStatus = params.done ? DailyCleaningStatus.DONE : DailyCleaningStatus.SKIPPED;

    return prisma.dailyCleaningTask.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt: new Date(),
        ...(params.note ? { note: params.note } : {}),
      },
      include: taskInclude,
    });
  }

  /**
   * Delete a daily cleaning task (manager only).
   */
  async deleteTask(taskId: string) {
    const task = await prisma.dailyCleaningTask.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Tâche introuvable.", 404);

    if (task.status === DailyCleaningStatus.DONE) {
      throw new AppError("Impossible de supprimer une tâche déjà terminée.", 400);
    }

    await prisma.dailyCleaningTask.delete({ where: { id: taskId } });
    return { message: "Tâche supprimée." };
  }
}
