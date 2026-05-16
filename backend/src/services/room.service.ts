import prisma from "../config/prisma";
import { RoomStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

/**
 * Service de gestion des chambres.
 */
export class RoomService {
  /**
   * Lister les chambres avec pagination et filtres.
   */
  async list(params: { page: number; limit: number; status?: RoomStatus; floor?: number }) {
    const { page, limit, status, floor } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (floor) where.floor = floor;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { roomNumber: "asc" },
      }),
      prisma.room.count({ where }),
    ]);

    return {
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creer une chambre.
   */
  async create(
    data: { roomNumber: string; floor: number; type: string; status?: RoomStatus },
    actorId: string
  ) {
    const existing = await prisma.room.findUnique({ where: { roomNumber: data.roomNumber } });
    if (existing) {
      throw new AppError(`La chambre ${data.roomNumber} existe deja.`, 409);
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        floor: data.floor,
        type: data.type,
        status: data.status || RoomStatus.AVAILABLE,
      },
    });

    await createAuditLog({
      actorId,
      action: "CREATE",
      entity: "Room",
      entityId: room.id,
      metadata: { roomNumber: room.roomNumber, floor: room.floor, type: room.type },
    });

    return room;
  }

  /**
   * Modifier une chambre.
   */
  async update(
    id: string,
    data: { roomNumber?: string; floor?: number; type?: string; status?: RoomStatus },
    actorId: string
  ) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    // Verifier unicite du numero si modifie
    if (data.roomNumber && data.roomNumber !== room.roomNumber) {
      const existing = await prisma.room.findUnique({ where: { roomNumber: data.roomNumber } });
      if (existing) {
        throw new AppError(`La chambre ${data.roomNumber} existe deja.`, 409);
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actorId,
      action: "UPDATE",
      entity: "Room",
      entityId: id,
      metadata: { changes: data },
    });

    return updated;
  }

  /**
   * Supprimer une chambre.
   * Interdit si liee a une reservation active (PENDING ou CHECKED_IN).
   */
  async delete(id: string, actorId: string) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    const activeReservations = await prisma.reservation.count({
      where: {
        roomId: id,
        status: { in: ["PENDING", "CHECKED_IN"] },
      },
    });

    if (activeReservations > 0) {
      throw new AppError(
        "Impossible de supprimer cette chambre. Elle est liee a des reservations actives.",
        400
      );
    }

    await prisma.room.delete({ where: { id } });

    await createAuditLog({
      actorId,
      action: "DELETE",
      entity: "Room",
      entityId: id,
      metadata: { roomNumber: room.roomNumber },
    });

    return { message: `Chambre ${room.roomNumber} supprimee.` };
  }
}
