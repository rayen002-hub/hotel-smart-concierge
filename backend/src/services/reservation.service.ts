import prisma from "../config/prisma";
import { ReservationStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

/**
 * Service de gestion des reservations.
 */
export class ReservationService {
  /**
   * Lister les reservations avec pagination et filtres.
   */
  async list(params: { page: number; limit: number; status?: ReservationStatus; roomId?: string }) {
    const { page, limit, status, roomId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          room: { select: { id: true, roomNumber: true, type: true } },
          _count: { select: { guestForms: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creer une reservation.
   */
  async create(
    data: {
      reservationNumber: string;
      guestFirstName: string;
      guestLastName: string;
      guestEmail?: string;
      guestPhone?: string;
      nationality?: string;
      checkInDate: string;
      checkOutDate: string;
      roomId?: string;
    },
    actorId: string
  ) {
    // Verifier unicite du numero de reservation
    const existing = await prisma.reservation.findUnique({
      where: { reservationNumber: data.reservationNumber },
    });
    if (existing) {
      throw new AppError(`La reservation ${data.reservationNumber} existe deja.`, 409);
    }

    // Verifier que la chambre existe si fournie
    if (data.roomId) {
      const room = await prisma.room.findUnique({ where: { id: data.roomId } });
      if (!room) {
        throw new AppError("Chambre introuvable.", 404);
      }
    }

    // Verifier les dates
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    if (checkOut <= checkIn) {
      throw new AppError("La date de checkout doit etre apres la date de checkin.", 400);
    }

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: data.reservationNumber,
        guestFirstName: data.guestFirstName,
        guestLastName: data.guestLastName,
        guestEmail: data.guestEmail || null,
        guestPhone: data.guestPhone || null,
        nationality: data.nationality || null,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        roomId: data.roomId || null,
        status: ReservationStatus.PENDING,
      },
      include: {
        room: { select: { id: true, roomNumber: true, type: true } },
      },
    });

    await createAuditLog({
      actorId,
      action: "CREATE",
      entity: "Reservation",
      entityId: reservation.id,
      metadata: {
        reservationNumber: reservation.reservationNumber,
        guest: `${data.guestFirstName} ${data.guestLastName}`,
      },
    });

    return reservation;
  }

  /**
   * Modifier une reservation.
   */
  async update(
    id: string,
    data: {
      guestFirstName?: string;
      guestLastName?: string;
      guestEmail?: string;
      guestPhone?: string;
      nationality?: string;
      checkInDate?: string;
      checkOutDate?: string;
      status?: ReservationStatus;
      roomId?: string;
    },
    actorId: string
  ) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    // Verifier la chambre si modifiee
    if (data.roomId) {
      const room = await prisma.room.findUnique({ where: { id: data.roomId } });
      if (!room) {
        throw new AppError("Chambre introuvable.", 404);
      }
    }

    // Construire les donnees de mise a jour
    const updateData: any = { ...data };
    if (data.checkInDate) updateData.checkInDate = new Date(data.checkInDate);
    if (data.checkOutDate) updateData.checkOutDate = new Date(data.checkOutDate);

    // Verifier les dates si les deux sont presentes
    const checkIn = data.checkInDate ? new Date(data.checkInDate) : reservation.checkInDate;
    const checkOut = data.checkOutDate ? new Date(data.checkOutDate) : reservation.checkOutDate;
    if (checkOut <= checkIn) {
      throw new AppError("La date de checkout doit etre apres la date de checkin.", 400);
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { id: true, roomNumber: true, type: true } },
      },
    });

    await createAuditLog({
      actorId,
      action: "UPDATE",
      entity: "Reservation",
      entityId: id,
      metadata: { changes: data },
    });

    return updated;
  }

  /**
   * Supprimer une reservation.
   */
  async delete(id: string, actorId: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      throw new AppError("Impossible de supprimer une reservation en cours (CHECKED_IN).", 400);
    }

    await prisma.reservation.delete({ where: { id } });

    await createAuditLog({
      actorId,
      action: "DELETE",
      entity: "Reservation",
      entityId: id,
      metadata: { reservationNumber: reservation.reservationNumber },
    });

    return { message: `Reservation ${reservation.reservationNumber} supprimee.` };
  }
}
