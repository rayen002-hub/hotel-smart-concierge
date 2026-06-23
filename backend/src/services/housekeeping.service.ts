import prisma from "../config/prisma";
import {
  HousekeepingTaskStatus,
  HousekeepingTaskResult,
  RoomStatus,
  ReservationStatus,
  Department,
  UserRole,
} from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";
import { verifyWorkerRoomQr } from "./qrToken.service";

// Inclusions standard pour les requetes de tache
const TASK_INCLUDE = {
  room: { select: { id: true, roomNumber: true, floor: true, type: true } },
  assignedTo: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, name: true } },
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      guestFirstName: true,
      guestLastName: true,
    },
  },
} as const;

/**
 * Service de gestion des taches de menage (housekeeping).
 */
export class HousekeepingService {
  /**
   * Lister les chambres occupees avec leur tache housekeeping active.
   */
  async listOccupiedRooms() {
    const rooms = await prisma.room.findMany({
      where: { status: RoomStatus.OCCUPIED },
      orderBy: { roomNumber: "asc" },
      include: {
        reservations: {
          where: { status: ReservationStatus.CHECKED_IN },
          select: {
            id: true,
            reservationNumber: true,
            guestFirstName: true,
            guestLastName: true,
            checkInDate: true,
            checkOutDate: true,
          },
          take: 1,
        },
        housekeepingTasks: {
          where: {
            status: {
              in: [
                HousekeepingTaskStatus.ASSIGNED,
                HousekeepingTaskStatus.IN_PROGRESS,
                HousekeepingTaskStatus.NEEDS_REVIEW,
              ],
            },
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return rooms.map((room) => ({
      ...room,
      activeReservation: room.reservations[0] || null,
      activeTask: room.housekeepingTasks[0] || null,
      reservations: undefined,
      housekeepingTasks: undefined,
    }));
  }

  /**
   * Creer une tache housekeeping.
   */
  async createTask(params: {
    roomId: string;
    reservationId?: string;
    assignedToId: string;
    assignedById: string;
    note?: string;
  }) {
    const room = await prisma.room.findUnique({
      where: { id: params.roomId },
    });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    const employee = await prisma.user.findUnique({
      where: { id: params.assignedToId },
      include: { employeeProfile: true },
    });
    if (!employee) {
      throw new AppError("Employe introuvable.", 404);
    }
    if (employee.role !== UserRole.EMPLOYEE) {
      throw new AppError("L'utilisateur assigne doit avoir le role EMPLOYEE.", 400);
    }
    if (employee.employeeProfile?.department !== Department.HOUSEKEEPING) {
      throw new AppError(
        "L'employe assigne doit appartenir au departement HOUSEKEEPING.",
        400
      );
    }

    if (params.reservationId) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: params.reservationId },
      });
      if (!reservation) {
        throw new AppError("Reservation introuvable.", 404);
      }
    }

    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: params.roomId,
        reservationId: params.reservationId || null,
        assignedToId: params.assignedToId,
        assignedById: params.assignedById,
        note: params.note || null,
        status: HousekeepingTaskStatus.ASSIGNED,
      },
      include: TASK_INCLUDE,
    });

    await createAuditLog({
      actorId: params.assignedById,
      action: "CREATE_HOUSEKEEPING_TASK",
      entity: "HousekeepingTask",
      entityId: task.id,
      metadata: {
        roomId: params.roomId,
        assignedToId: params.assignedToId,
        note: params.note,
      },
    });

    return task;
  }

  /**
   * Demarrer une tache housekeeping (scan entree chambre).
   */
  async startTask(params: {
    taskId: string;
    employeeId: string;
    workerRoomQrToken: string;
  }) {
    const task = await prisma.housekeepingTask.findUnique({
      where: { id: params.taskId },
    });
    if (!task) {
      throw new AppError("Tache introuvable.", 404);
    }

    if (task.assignedToId !== params.employeeId) {
      throw new AppError("Cette tache ne vous est pas assignee.", 403);
    }

    if (task.status === HousekeepingTaskStatus.COMPLETED) {
      throw new AppError("Cette tache est deja terminee.", 400);
    }
    if (task.status === HousekeepingTaskStatus.CANCELLED) {
      throw new AppError("Cette tache a ete annulee.", 400);
    }
    if (task.status === HousekeepingTaskStatus.IN_PROGRESS) {
      throw new AppError("Cette tache est deja en cours.", 400);
    }

    // Valider le QR de la chambre (reuse existing worker QR system)
    const roomData = await verifyWorkerRoomQr(params.workerRoomQrToken);
    if (roomData.roomId !== task.roomId) {
      throw new AppError(
        "Mauvaise chambre. Le QR scanne ne correspond pas a la chambre de cette tache.",
        400
      );
    }

    const updated = await prisma.housekeepingTask.update({
      where: { id: params.taskId },
      data: {
        status: HousekeepingTaskStatus.IN_PROGRESS,
        entryTime: new Date(),
      },
      include: TASK_INCLUDE,
    });

    await createAuditLog({
      actorId: params.employeeId,
      action: "START_HOUSEKEEPING_TASK",
      entity: "HousekeepingTask",
      entityId: params.taskId,
      metadata: { roomId: task.roomId },
    });

    return updated;
  }

  /**
   * Terminer une tache housekeeping (scan sortie chambre).
   */
  async finishTask(params: {
    taskId: string;
    employeeId: string;
    workerRoomQrToken: string;
    result: HousekeepingTaskResult;
    workerComment?: string;
  }) {
    const task = await prisma.housekeepingTask.findUnique({
      where: { id: params.taskId },
    });
    if (!task) {
      throw new AppError("Tache introuvable.", 404);
    }

    if (task.assignedToId !== params.employeeId) {
      throw new AppError("Cette tache ne vous est pas assignee.", 403);
    }

    if (task.status === HousekeepingTaskStatus.COMPLETED) {
      throw new AppError("Cette tache est deja terminee.", 400);
    }
    if (task.status === HousekeepingTaskStatus.CANCELLED) {
      throw new AppError("Cette tache a ete annulee.", 400);
    }
    if (task.status !== HousekeepingTaskStatus.IN_PROGRESS) {
      throw new AppError(
        "La tache doit etre en cours (IN_PROGRESS) avant de pouvoir la terminer. Scannez d'abord pour demarrer.",
        400
      );
    }

    // Valider le QR de la chambre
    const roomData = await verifyWorkerRoomQr(params.workerRoomQrToken);
    if (roomData.roomId !== task.roomId) {
      throw new AppError(
        "Mauvaise chambre. Le QR scanne ne correspond pas a la chambre de cette tache.",
        400
      );
    }

    // Determiner le nouveau statut selon le resultat
    const newStatus =
      params.result === HousekeepingTaskResult.DONE
        ? HousekeepingTaskStatus.COMPLETED
        : HousekeepingTaskStatus.NEEDS_REVIEW;

    const updated = await prisma.housekeepingTask.update({
      where: { id: params.taskId },
      data: {
        status: newStatus,
        exitTime: new Date(),
        result: params.result,
        workerComment: params.workerComment || null,
      },
      include: TASK_INCLUDE,
    });

    await createAuditLog({
      actorId: params.employeeId,
      action:
        newStatus === HousekeepingTaskStatus.COMPLETED
          ? "COMPLETE_HOUSEKEEPING_TASK"
          : "REVIEW_HOUSEKEEPING_TASK",
      entity: "HousekeepingTask",
      entityId: params.taskId,
      metadata: {
        roomId: task.roomId,
        result: params.result,
        workerComment: params.workerComment,
      },
    });

    return { task: updated, newStatus };
  }

  /**
   * Lister les taches housekeeping.
   * - ADMIN/HOUSEKEEPING_MANAGER : toutes les taches
   * - EMPLOYEE : uniquement les taches qui lui sont assignees
   */
  async listTasks(params: {
    userId: string;
    userRole: UserRole;
    status?: HousekeepingTaskStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.userRole === UserRole.EMPLOYEE) {
      where.assignedToId = params.userId;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [tasks, total] = await Promise.all([
      prisma.housekeepingTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: TASK_INCLUDE,
      }),
      prisma.housekeepingTask.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
