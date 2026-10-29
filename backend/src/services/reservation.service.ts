import prisma from "../config/prisma";
import { Prisma, ReservationStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";
import { getHotelTimeZone, hotelCalendarDate } from "../utils/hotelDate";
import { getReservationDisplayStatus } from "./reservationLifecycle.service";

function reservationsOverlapInHotelCalendar(
  existing: { checkInDate: Date; checkOutDate: Date },
  checkIn: Date,
  checkOut: Date,
  timeZone: string
): boolean {
  const existingStart = hotelCalendarDate(existing.checkInDate, timeZone);
  const existingEnd = hotelCalendarDate(existing.checkOutDate, timeZone);
  const requestedStart = hotelCalendarDate(checkIn, timeZone);
  const requestedEnd = hotelCalendarDate(checkOut, timeZone);
  return existingStart < requestedEnd && existingEnd > requestedStart;
}

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
    const statusNow = new Date();
    const timeZone = getHotelTimeZone();

    return {
      data: reservations.map((reservation) => ({
        ...reservation,
        displayStatus: getReservationDisplayStatus(reservation, statusNow, timeZone),
      })),
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
      adultsCount?: number;
      childrenCount?: number;
    },
    actorId: string
  ) {
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    const timeZone = getHotelTimeZone();
    if (
      Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) ||
      hotelCalendarDate(checkOut, timeZone) <= hotelCalendarDate(checkIn, timeZone)
    ) {
      throw new AppError("La date de checkout doit etre apres la date de checkin.", 400);
    }

    const adultsCount = data.adultsCount ?? 1;
    const childrenCount = data.childrenCount ?? 0;
    if (!Number.isInteger(adultsCount) || adultsCount < 1 ||
        !Number.isInteger(childrenCount) || childrenCount < 0) {
      throw new AppError("Le nombre de voyageurs est invalide.", 400);
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.reservation.findUnique({
          where: { reservationNumber: data.reservationNumber },
        });
        if (existing) {
          throw new AppError(`La reservation ${data.reservationNumber} existe deja.`, 409);
        }

        if (data.roomId) {
          const room = await tx.room.findUnique({ where: { id: data.roomId } });
          if (!room) throw new AppError("Chambre introuvable.", 404);

          const activeReservations = await tx.reservation.findMany({
            where: {
              roomId: data.roomId,
              status: { in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN] },
            },
            select: { checkInDate: true, checkOutDate: true },
          });
          if (activeReservations.some((existing) =>
            reservationsOverlapInHotelCalendar(existing, checkIn, checkOut, timeZone)
          )) {
            throw new AppError("La chambre est déjà réservée sur cette période.", 409);
          }
        }

        const reservation = await tx.reservation.create({
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
            adultsCount,
            childrenCount,
            totalGuests: adultsCount + childrenCount,
            status: ReservationStatus.PENDING,
          },
          include: {
            room: { select: { id: true, roomNumber: true, type: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "CREATE",
            entity: "Reservation",
            entityId: reservation.id,
            metadata: {
              reservationNumber: reservation.reservationNumber,
              guest: `${data.guestFirstName} ${data.guestLastName}`,
            },
          },
        });
        return reservation;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new AppError("Une réservation concurrente a modifié la disponibilité. Réessayez.", 409);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(`La reservation ${data.reservationNumber} existe deja.`, 409);
      }
      throw error;
    }
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
    try {
      return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new AppError("Reservation introuvable.", 404);

      // Lifecycle states are owned by check-in and the server-side status job.
      // The generic edit endpoint may only cancel an unstarted reservation.
      if (data.status !== undefined) {
        if (data.status !== ReservationStatus.CANCELLED) {
          throw new AppError("Ce statut ne peut pas être modifié depuis l'édition de réservation.", 409);
        }
        if (reservation.status !== ReservationStatus.PENDING) {
          throw new AppError("Seule une réservation en attente peut être annulée.", 409);
        }
      }

      const checkIn = data.checkInDate ? new Date(data.checkInDate) : reservation.checkInDate;
      const checkOut = data.checkOutDate ? new Date(data.checkOutDate) : reservation.checkOutDate;
      const timeZone = getHotelTimeZone();
      if (
        Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) ||
        hotelCalendarDate(checkOut, timeZone) <= hotelCalendarDate(checkIn, timeZone)
      ) {
        throw new AppError("La date de checkout doit etre apres la date de checkin.", 400);
      }

      const roomId = data.roomId === undefined ? reservation.roomId : data.roomId;
      if (roomId) {
        const room = await tx.room.findUnique({ where: { id: roomId } });
        if (!room) throw new AppError("Chambre introuvable.", 404);

        const effectiveStatus = data.status ?? reservation.status;
        if (effectiveStatus === ReservationStatus.PENDING || effectiveStatus === ReservationStatus.CHECKED_IN) {
          const activeReservations = await tx.reservation.findMany({
            where: {
              id: { not: id },
              roomId,
              status: { in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN] },
            },
            select: { checkInDate: true, checkOutDate: true },
          });
          if (activeReservations.some((existing) =>
            reservationsOverlapInHotelCalendar(existing, checkIn, checkOut, timeZone)
          )) {
            throw new AppError("La chambre est déjà réservée sur cette période.", 409);
          }
        }
      }

      const updateData: Prisma.ReservationUpdateInput = { ...data };
      if (data.checkInDate) updateData.checkInDate = checkIn;
      if (data.checkOutDate) updateData.checkOutDate = checkOut;
      if (data.roomId !== undefined) {
        updateData.room = data.roomId ? { connect: { id: data.roomId } } : { disconnect: true };
        delete (updateData as Record<string, unknown>).roomId;
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: updateData,
        include: { room: { select: { id: true, roomNumber: true, type: true } } },
      });

      await tx.auditLog.create({
        data: { actorId, action: "UPDATE", entity: "Reservation", entityId: id, metadata: { changes: data } },
      });
      return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new AppError("Une réservation concurrente a modifié la disponibilité. Réessayez.", 409);
      }
      throw error;
    }
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
