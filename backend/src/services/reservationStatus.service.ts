import {
  Prisma,
  ReservationStatus,
  RoomStatus,
} from "@prisma/client";
import prisma from "../config/prisma";
import { compareHotelCalendarDates, getHotelTimeZone } from "../utils/hotelDate";

export interface ReservationStatusUpdateSummary {
  checkedOut: number;
  roomsMarkedCleaning: number;
}

/**
 * Idempotently closes reservations whose hotel-local calendar dates ended.
 * This is intended for a server-side scheduled invocation, not a browser task.
 */
export class ReservationStatusService {
  async updateExpiredStatuses(
    now: Date = new Date(),
    timeZone: string = getHotelTimeZone()
  ): Promise<ReservationStatusUpdateSummary> {
    const candidates = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CHECKED_IN,
      },
      select: {
        id: true,
        reservationNumber: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        roomId: true,
      },
    });

    const summary: ReservationStatusUpdateSummary = {
      checkedOut: 0,
      roomsMarkedCleaning: 0,
    };

    for (const reservation of candidates) {
      const checkoutEnded = compareHotelCalendarDates(reservation.checkOutDate, now, timeZone) < 0;
      if (checkoutEnded) {
        const transition = await prisma.$transaction(async (tx) => {
          const update = await tx.reservation.updateMany({
            where: { id: reservation.id, status: ReservationStatus.CHECKED_IN },
            data: { status: ReservationStatus.CHECKED_OUT },
          });

          if (update.count === 0) return { transitioned: false, roomMarkedCleaning: false };

          let markedCleaning = false;
          if (reservation.roomId) {
            const otherOccupant = await tx.reservation.findFirst({
              where: {
                id: { not: reservation.id },
                roomId: reservation.roomId,
                status: ReservationStatus.CHECKED_IN,
              },
              select: { id: true },
            });
            if (!otherOccupant) {
              const roomUpdate = await tx.room.updateMany({
                where: { id: reservation.roomId, status: RoomStatus.OCCUPIED },
                data: { status: RoomStatus.CLEANING },
              });
              markedCleaning = roomUpdate.count > 0;
            }
          }

          await tx.auditLog.create({
            data: {
              action: "RESERVATION_CHECKED_OUT",
              entity: "Reservation",
              entityId: reservation.id,
              metadata: { reservationNumber: reservation.reservationNumber },
            },
          });
          return { transitioned: true, roomMarkedCleaning: markedCleaning };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        if (transition.transitioned) summary.checkedOut += 1;
        if (transition.roomMarkedCleaning) summary.roomsMarkedCleaning += 1;
      }
    }

    return summary;
  }
}
