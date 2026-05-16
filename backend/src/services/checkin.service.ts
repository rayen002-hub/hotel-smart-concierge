import prisma from "../config/prisma";
import { ReservationStatus, RoomStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { encryptField } from "../utils/encryption";
import { createAuditLog } from "../utils/audit";
import { env } from "../config/env";

/**
 * Service de check-in public (sans authentification).
 */
export class CheckinService {
  /**
   * Rechercher une reservation par son numero.
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
      },
    });

    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    return {
      reservationId: reservation.id,
      guestFirstName: reservation.guestFirstName,
      guestLastName: reservation.guestLastName,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      status: reservation.status,
    };
  }

  /**
   * Soumettre le formulaire de check-in.
   */
  async submit(data: {
    reservationNumber: string;
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
      throw new AppError("Cette reservation est deja terminee (CHECKED_OUT).", 400);
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new AppError("Cette reservation a ete annulee.", 400);
    }

    // Chiffrer le numero de passeport si fourni
    let passportEncrypted: string | null = null;
    if (data.passportNumber) {
      passportEncrypted = encryptField(data.passportNumber, env.FIELD_ENCRYPTION_KEY);
    }

    // Creer ou mettre a jour le GuestForm
    await prisma.guestForm.upsert({
      where: { reservationId: reservation.id },
      update: {
        fullName: data.fullName,
        nationality: data.nationality,
        passportEncrypted,
        phone: data.phone || null,
        address: data.address || null,
        submittedAt: new Date(),
      },
      create: {
        reservationId: reservation.id,
        fullName: data.fullName,
        nationality: data.nationality,
        passportEncrypted,
        phone: data.phone || null,
        address: data.address || null,
      },
    });

    // Passer la reservation a CHECKED_IN
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CHECKED_IN },
    });

    // Passer la chambre a OCCUPIED si roomId existe
    if (reservation.roomId) {
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

    // Audit log (sans actorId car c'est public)
    await createAuditLog({
      actorId: null,
      action: "CHECKIN",
      entity: "Reservation",
      entityId: reservation.id,
      metadata: {
        reservationNumber: reservation.reservationNumber,
        guestName: data.fullName,
        source: "public_checkin",
      },
    });

    return {
      message: "Check-in effectue avec succes.",
      reservationNumber: reservation.reservationNumber,
      status: "CHECKED_IN",
      room: reservation.room
        ? { roomNumber: reservation.room.roomNumber, type: reservation.room.type }
        : null,
    };
  }
}
