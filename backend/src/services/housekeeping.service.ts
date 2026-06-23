import prisma from "../config/prisma";
import {
  HousekeepingTaskStatus,
  RoomStatus,
  ReservationStatus,
  Department,
  UserRole,
} from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

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
    // Verifier que la chambre existe
    const room = await prisma.room.findUnique({
      where: { id: params.roomId },
    });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    // Verifier que l'employe est bien un employe du departement HOUSEKEEPING
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

    // Verifier la reservation si fournie
    if (params.reservationId) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: params.reservationId },
      });
      if (!reservation) {
        throw new AppError("Reservation introuvable.", 404);
      }
    }

    // Creer la tache
    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: params.roomId,
        reservationId: params.reservationId || null,
        assignedToId: params.assignedToId,
        assignedById: params.assignedById,
        note: params.note || null,
        status: HousekeepingTaskStatus.ASSIGNED,
      },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true } },
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
      },
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

    // Filtrer par role
    if (params.userRole === UserRole.EMPLOYEE) {
      where.assignedToId = params.userId;
    }

    // Filtre optionnel par statut
    if (params.status) {
      where.status = params.status;
    }

    const [tasks, total] = await Promise.all([
      prisma.housekeepingTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
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
        },
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
