import prisma from "../config/prisma";
import {
  CheckinCompletionStatus,
  Prisma,
  ReservationStatus,
  RoomStatus,
  TravelerType,
} from "@prisma/client";
import { AppError } from "./auth.service";
import { encryptField } from "../utils/encryption";
import { env } from "../config/env";
import { assertCheckinEligible, getCheckinEligibility } from "./reservationLifecycle.service";
import { getHotelTimeZone } from "../utils/hotelDate";

/** Public QR check-in service. The service is the authoritative enforcement
 * point for every request to submit guest details, regardless of client. */
export class CheckinService {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly timeZone: string = getHotelTimeZone()
  ) {}

  /** Look up a reservation and return server-computed check-in eligibility. */
  async lookup(reservationNumber: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { reservationNumber },
      select: {
        id: true,
        guestFirstName: true,
        guestLastName: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        adultsCount: true,
        childrenCount: true,
        totalGuests: true,
        checkinCompletionStatus: true,
        guestForms: {
          select: {
            travelerIndex: true,
            travelerType: true,
            isCompleted: true,
            fullName: true,
          },
          orderBy: { travelerIndex: "asc" },
        },
      },
    });

    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    const travelers = [];
    for (let i = 1; i <= reservation.totalGuests; i++) {
      const form = reservation.guestForms.find((f) => f.travelerIndex === i);
      travelers.push({
        travelerIndex: i,
        travelerType: i <= reservation.adultsCount ? TravelerType.ADULT : TravelerType.CHILD,
        isCompleted: form?.isCompleted ?? false,
        fullName: form?.fullName ?? null,
      });
    }

    const checkInEligibility = getCheckinEligibility(
      reservation,
      this.now(),
      this.timeZone
    );

    return {
      reservationId: reservation.id,
      guestFirstName: reservation.guestFirstName,
      guestLastName: reservation.guestLastName,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      status: reservation.status,
      adultsCount: reservation.adultsCount,
      childrenCount: reservation.childrenCount,
      totalGuests: reservation.totalGuests,
      checkinCompletionStatus: reservation.checkinCompletionStatus,
      checkInEligibility: {
        eligible: checkInEligibility.eligible,
        reason: checkInEligibility.reason,
      },
      travelers,
    };
  }

  /** Submit one traveler form and transition atomically when all are complete. */
  async submit(data: {
    reservationNumber: string;
    travelerIndex: number;
    travelerType: string;
    fullName: string;
    nationality: string;
    passportNumber?: string;
    phone?: string;
    address?: string;
  }) {
    const passportEncrypted = data.passportNumber
      ? encryptField(data.passportNumber, env.FIELD_ENCRYPTION_KEY)
      : null;
    const travelerType = data.travelerType === "CHILD" ? TravelerType.CHILD : TravelerType.ADULT;

    try {
      return await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { reservationNumber: data.reservationNumber },
          include: { room: true },
        });

        if (!reservation) {
          throw new AppError("Reservation introuvable.", 404);
        }

        const now = this.now();
        assertCheckinEligible(reservation, now, this.timeZone);

        if (data.travelerIndex < 1 || data.travelerIndex > reservation.totalGuests) {
          throw new AppError(
            `Index voyageur invalide. Doit etre entre 1 et ${reservation.totalGuests}.`,
            400
          );
        }

        await tx.guestForm.upsert({
          where: {
            reservationId_travelerIndex: {
              reservationId: reservation.id,
              travelerIndex: data.travelerIndex,
            },
          },
          update: {
            fullName: data.fullName,
            nationality: data.nationality,
            travelerType,
            passportEncrypted,
            phone: data.phone || null,
            address: data.address || null,
            isCompleted: true,
            submittedAt: now,
          },
          create: {
            reservationId: reservation.id,
            travelerIndex: data.travelerIndex,
            travelerType,
            fullName: data.fullName,
            nationality: data.nationality,
            passportEncrypted,
            phone: data.phone || null,
            address: data.address || null,
            isCompleted: true,
            submittedAt: now,
          },
        });

        const completedCount = await tx.guestForm.count({
          where: { reservationId: reservation.id, isCompleted: true },
        });
        const completionStatus = completedCount === 0
          ? CheckinCompletionStatus.NOT_STARTED
          : completedCount < reservation.totalGuests
            ? CheckinCompletionStatus.PARTIAL
            : CheckinCompletionStatus.COMPLETED;
        const completed = completionStatus === CheckinCompletionStatus.COMPLETED;

        // Conditional status update is the final compare-and-set. With the
        // serializable transaction it prevents duplicate/replayed completions.
        const transition = await tx.reservation.updateMany({
          where: { id: reservation.id, status: ReservationStatus.PENDING },
          data: {
            checkinCompletionStatus: completionStatus,
            ...(completed ? { status: ReservationStatus.CHECKED_IN } : {}),
          },
        });
        if (transition.count !== 1) {
          throw new AppError("Cette réservation a changé pendant le check-in. Rechargez-la.", 409);
        }

        if (completed && reservation.roomId) {
          await tx.room.update({
            where: { id: reservation.roomId },
            data: { status: RoomStatus.OCCUPIED },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: null,
            action: "CHECKIN_TRAVELER",
            entity: "GuestForm",
            entityId: reservation.id,
            metadata: {
              reservationNumber: reservation.reservationNumber,
              travelerIndex: data.travelerIndex,
              travelerType,
              source: "public_checkin",
            },
          },
        });

        return {
          message: completed
            ? "Check-in complet ! Toutes les fiches sont remplies."
            : `Fiche voyageur ${data.travelerIndex} enregistree.`,
          reservationNumber: reservation.reservationNumber,
          travelerIndex: data.travelerIndex,
          checkinCompletionStatus: completionStatus,
          status: completed ? ReservationStatus.CHECKED_IN : reservation.status,
          room: reservation.room
            ? { roomNumber: reservation.room.roomNumber, type: reservation.room.type }
            : null,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new AppError("Une autre opération a modifié cette réservation. Rechargez-la.", 409);
      }
      throw error;
    }
  }
}
