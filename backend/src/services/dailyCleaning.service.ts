import prisma from "../config/prisma";
import { DailyCleaningStatus, WorkerShift } from "@prisma/client";
import { AppError } from "./auth.service";
import { getBusinessDay, parseBusinessDay, formatBusinessDay } from "../utils/businessDay";
import { createAuditLog } from "../utils/audit";

const taskInclude = {
  room: { select: { id: true, roomNumber: true, floor: true, type: true, status: true } },
  worker: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, name: true } },
} as const;

// ─── Shift availability helpers ─────────────────────────────────────────────

/**
 * Determine which shift is currently active based on the current UTC hour.
 * 07:00–15:00 → MORNING, 15:00–23:00 → EVENING, 23:00–07:00 → NIGHT
 */
function getCurrentShift(): WorkerShift {
  const hour = new Date().getUTCHours();
  if (hour >= 7 && hour < 15) return WorkerShift.MORNING;
  if (hour >= 15 && hour < 23) return WorkerShift.EVENING;
  return WorkerShift.NIGHT;
}

/**
 * Resolve French label for a shift for error messages.
 */
const SHIFT_LABEL: Record<WorkerShift, string> = {
  [WorkerShift.MORNING]: "07:00–15:00",
  [WorkerShift.EVENING]: "15:00–23:00",
  [WorkerShift.NIGHT]:   "23:00–07:00",
  [WorkerShift.DAY_OFF]: "Repos (jour de congé)",
};

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

    const where: {
      businessDay: Date;
      workerId?: string;
      status?: DailyCleaningStatus;
      roomId?: string;
    } = { businessDay: day };
    if (params.workerId) where.workerId = params.workerId;
    if (params.status) where.status = params.status as DailyCleaningStatus;
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
   *
   * Rules:
   *  1. Room must exist.
   *  2. Worker must exist and belong to HOUSEKEEPING department.
   *  3. Worker must NOT be on DAY_OFF and must be scheduled for the CURRENT shift.
   *  4. No active (non-cancelled/done) task for the same room+businessDay
   *     (prevents double-booking a room; same worker can have many rooms).
   */
  async createTask(params: {
    roomId: string;
    workerId: string;
    note?: string;
    assignedById: string;
    businessDay?: string;
    skipShiftCheck?: boolean; // for admin override
  }) {
    const day = parseBusinessDay(params.businessDay);

    // 1. Verify room exists
    const room = await prisma.room.findUnique({ where: { id: params.roomId } });
    if (!room) throw new AppError("Chambre introuvable.", 404);

    // 2. Verify worker exists + is a HOUSEKEEPING employee
    const worker = await prisma.user.findUnique({
      where: { id: params.workerId },
      include: { employeeProfile: true },
    });
    if (!worker) throw new AppError("Employé introuvable.", 404);
    if (!worker.employeeProfile) {
      throw new AppError("Cet utilisateur n'a pas de profil employé.", 400);
    }
    if (worker.employeeProfile.department !== "HOUSEKEEPING") {
      throw new AppError(
        "Seuls les agents du département MÉNAGE peuvent être assignés aux tâches quotidiennes.",
        400
      );
    }

    // 3. Shift availability check (skippable by admin override)
    if (!params.skipShiftCheck) {
      // Look up shift using the same Date object used elsewhere
      const shiftSchedule = await prisma.workerShiftSchedule.findFirst({
        where: { workerId: params.workerId, businessDay: day },
      });

      const workerShift = shiftSchedule?.shift ?? null;

      // Day off — never assignable
      if (workerShift === WorkerShift.DAY_OFF) {
        throw new AppError(
          `${worker.name} est en repos aujourd'hui. Impossible d'assigner une tâche.`,
          400
        );
      }

      // If shift is defined, check it matches the current time window
      if (workerShift !== null) {
        const currentShift = getCurrentShift();
        if (workerShift !== currentShift) {
          throw new AppError(
            `${worker.name} est planifié pour le shift ${SHIFT_LABEL[workerShift]}, mais le shift actuel est ${SHIFT_LABEL[currentShift]}. Impossible d'assigner une tâche hors de son shift.`,
            400
          );
        }
      }

      // Worker must be marked available
      if (!worker.employeeProfile.isAvailable) {
        throw new AppError(
          `${worker.name} est marqué comme non disponible. Impossible d'assigner une tâche.`,
          400
        );
      }
    }


    // 4. Duplicate room-day check (block double-booking same room same day)
    const existingTask = await prisma.dailyCleaningTask.findFirst({
      where: {
        roomId: params.roomId,
        businessDay: day,
        status: { notIn: [DailyCleaningStatus.SKIPPED] },
      },
    });
    if (existingTask) {
      throw new AppError(
        `La chambre ${room.roomNumber} a déjà une tâche de nettoyage assignée pour aujourd'hui (statut : ${existingTask.status}). Supprimez l'ancienne pour en créer une nouvelle.`,
        409
      );
    }

    // 5. Create the task
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
      action: "CREATE_DAILY_TASK",
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
