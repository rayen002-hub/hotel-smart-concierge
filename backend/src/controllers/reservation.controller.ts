import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ReservationService } from "../services/reservation.service";
import { ReservationStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { decryptField } from "../utils/encryption";
import { env } from "../config/env";


const reservationService = new ReservationService();

/**
 * GET /api/reservations
 */
export const listReservations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ReservationStatus | undefined;
    const roomId = req.query.roomId as string | undefined;

    const result = await reservationService.list({ page, limit, status, roomId });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reservations
 */
export const createReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reservation = await reservationService.create(req.body, req.userId as string);
    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reservations/:id
 */
export const updateReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reservation = await reservationService.update(req.params.id as string, req.body, req.userId as string);
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reservations/:id
 */
export const deleteReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await reservationService.delete(req.params.id as string, req.userId as string);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reservations/:id/guest-forms
 * Retourne les fiches voyageurs soumises pour une reservation.
 * Le passeport est dechiffre cote serveur puis masque avant envoi.
 */
export const getReservationGuestForms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, roomNumber: true, type: true } },
        guestForms: {
          orderBy: { travelerIndex: "asc" as const },
          select: {
            id: true,
            travelerIndex: true,
            travelerType: true,
            isCompleted: true,
            fullName: true,
            nationality: true,
            passportEncrypted: true,
            phone: true,
            address: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!reservation) {
      res.status(404).json({ success: false, error: "Reservation introuvable." });
      return;
    }

    // Masquer le passeport : dechiffrer puis renvoyer seulement les 3 premiers caracteres + ****
    const guestForms = reservation.guestForms.map((form) => {
      let passportMasked: string | null = null;
      if (form.passportEncrypted) {
        try {
          const decrypted = decryptField(form.passportEncrypted, env.FIELD_ENCRYPTION_KEY);
          // Afficher uniquement les 3 premiers caracteres pour verification d'identite
          passportMasked = decrypted.length > 3
            ? decrypted.substring(0, 3) + "****"
            : decrypted.substring(0, 1) + "****";
        } catch {
          passportMasked = "—";
        }
      }

      return {
        id: form.id,
        travelerIndex: form.travelerIndex,
        travelerType: form.travelerType,
        isCompleted: form.isCompleted,
        fullName: form.fullName,
        nationality: form.nationality,
        passportMasked,
        phone: form.phone,
        address: form.address,
        submittedAt: form.submittedAt,
        // passportEncrypted is intentionally NOT sent
      };
    });

    res.status(200).json({
      success: true,
      data: {
        reservation: {
          id: reservation.id,
          reservationNumber: reservation.reservationNumber,
          guestFirstName: reservation.guestFirstName,
          guestLastName: reservation.guestLastName,
          guestEmail: reservation.guestEmail,
          guestPhone: reservation.guestPhone,
          nationality: reservation.nationality,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          status: reservation.status,
          adultsCount: reservation.adultsCount,
          childrenCount: reservation.childrenCount,
          totalGuests: reservation.totalGuests,
          checkinCompletionStatus: reservation.checkinCompletionStatus,
          room: reservation.room,
        },
        guestForms,
      },
    });
  } catch (error) {
    next(error);
  }
};

