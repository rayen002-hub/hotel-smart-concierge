import prisma from "../config/prisma";
import {
  ReservationStatus,
  RoomStatus,
  CheckinCompletionStatus,
  TravelerType,
} from "@prisma/client";
import { AppError } from "./auth.service";
import { encryptField } from "../utils/encryption";
import { createAuditLog } from "../utils/audit";
import { env } from "../config/env";

/**
 * Service de check-in public (sans authentification).
 * Supporte plusieurs voyageurs par reservation.
 */
export class CheckinService {
  /**
   * Rechercher une reservation par son numero.
   * Retourne la reservation + la liste des slots voyageurs.
   */
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

    // Construire la liste des slots attendus (1..totalGuests)
    const travelers = [];
    for (let i = 1; i <= reservation.totalGuests; i++) {
      const form = reservation.guestForms.find((f) => f.travelerIndex === i);
      travelers.push({
        travelerIndex: i,
        travelerType:
          i <= reservation.adultsCount
            ? TravelerType.ADULT
            : TravelerType.CHILD,
        isCompleted: form?.isCompleted ?? false,
        fullName: form?.fullName ?? null,
      });
    }

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
      travelers,
    };
  }

  /**
   * Soumettre une fiche voyageur pour un index donne.
   */
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
    // Chercher la reservation
    const reservation = await prisma.reservation.findUnique({
      where: { reservationNumber: data.reservationNumber },
      include: { room: true },
    });

    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    // Refuser si CHECKED_OUT ou CANCELLED
    if (reservation.status === ReservationStatus.CHECKED_OUT) {
      throw new AppError(
        "Cette reservation est deja terminee (CHECKED_OUT).",
        400
      );
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new AppError("Cette reservation a ete annulee.", 400);
    }

    // Valider travelerIndex
    if (
      data.travelerIndex < 1 ||
      data.travelerIndex > reservation.totalGuests
    ) {
      throw new AppError(
        `Index voyageur invalide. Doit etre entre 1 et ${reservation.totalGuests}.`,
        400
      );
    }

    // Chiffrer le numero de passeport si fourni
    let passportEncrypted: string | null = null;
    if (data.passportNumber) {
      passportEncrypted = encryptField(
        data.passportNumber,
        env.FIELD_ENCRYPTION_KEY
      );
    }

    // Determiner le type de voyageur
    const travelerType =
      data.travelerType === "CHILD" ? TravelerType.CHILD : TravelerType.ADULT;

    // Upsert le GuestForm par (reservationId, travelerIndex)
    await prisma.guestForm.upsert({
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
        submittedAt: new Date(),
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
      },
    });

    // Recalculer le statut de completion
    const newStatus = await this.recalculateCheckinStatus(reservation.id);

    // Si COMPLETED → passer la chambre a OCCUPIED
    if (
      newStatus === CheckinCompletionStatus.COMPLETED &&
      reservation.roomId
    ) {
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

    // Audit log
    await createAuditLog({
      actorId: null,
      action: "CHECKIN_TRAVELER",
      entity: "GuestForm",
      entityId: reservation.id,
      metadata: {
        reservationNumber: reservation.reservationNumber,
        travelerIndex: data.travelerIndex,
        travelerType: data.travelerType,
        guestName: data.fullName,
        source: "public_checkin",
      },
    });

    return {
      message:
        newStatus === CheckinCompletionStatus.COMPLETED
          ? "Check-in complet ! Toutes les fiches sont remplies."
          : `Fiche voyageur ${data.travelerIndex} enregistree.`,
      reservationNumber: reservation.reservationNumber,
      travelerIndex: data.travelerIndex,
      checkinCompletionStatus: newStatus,
      status:
        newStatus === CheckinCompletionStatus.COMPLETED
          ? "CHECKED_IN"
          : reservation.status,
      room: reservation.room
        ? {
            roomNumber: reservation.room.roomNumber,
            type: reservation.room.type,
          }
        : null,
    };
  }

  /**
   * Recalculer le statut de completion du check-in.
   */
  private async recalculateCheckinStatus(
    reservationId: string
  ): Promise<CheckinCompletionStatus> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { guestForms: true },
    });

    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    const completedCount = reservation.guestForms.filter(
      (f) => f.isCompleted
    ).length;

    let newStatus: CheckinCompletionStatus;
    if (completedCount === 0) {
      newStatus = CheckinCompletionStatus.NOT_STARTED;
    } else if (completedCount < reservation.totalGuests) {
      newStatus = CheckinCompletionStatus.PARTIAL;
    } else {
      newStatus = CheckinCompletionStatus.COMPLETED;
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checkinCompletionStatus: newStatus,
        ...(newStatus === CheckinCompletionStatus.COMPLETED
          ? { status: ReservationStatus.CHECKED_IN }
          : {}),
      },
    });

    return newStatus;
  }
}
