import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../services/auth.service";
import {
  generateClientRoomToken,
  generateWorkerRoomQr,
} from "../services/qrToken.service";
import { createAuditLog } from "../utils/audit";
import { ReservationStatus } from "@prisma/client";

/**
 * POST /api/reservations/:id/client-room-link
 * Generer un lien d'acces PWA pour le client.
 */
export const generateClientRoomLink = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reservationId = req.params.id as string;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new AppError("Reservation introuvable.", 404);
    }

    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new AppError("La reservation doit etre en CHECKED_IN pour generer un lien.", 400);
    }

    if (!reservation.roomId) {
      throw new AppError("Aucune chambre assignee a cette reservation.", 400);
    }

    const token = generateClientRoomToken(
      reservation.id,
      reservation.roomId,
      reservation.checkOutDate
    );

    const url = `${env.FRONTEND_URL}/room?token=${token}`;

    await createAuditLog({
      actorId: req.userId,
      action: "GENERATE_CLIENT_ROOM_LINK",
      entity: "Reservation",
      entityId: reservationId,
      metadata: { reservationNumber: reservation.reservationNumber },
    });

    res.status(200).json({
      success: true,
      data: { url },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rooms/:id/worker-qr
 * Generer un QR code pour le scan employe.
 */
export const generateWorkerQr = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomId = req.params.id as string;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    const qrPayload = generateWorkerRoomQr(room.id, room.workerQrVersion);

    await createAuditLog({
      actorId: req.userId,
      action: "GENERATE_WORKER_QR",
      entity: "Room",
      entityId: roomId,
      metadata: { roomNumber: room.roomNumber, version: room.workerQrVersion },
    });

    res.status(200).json({
      success: true,
      data: { qrPayload },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rooms/:id/regenerate-worker-qr
 * Regenerer le QR employe (invalide l'ancien).
 */
export const regenerateWorkerQr = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomId = req.params.id as string;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError("Chambre introuvable.", 404);
    }

    // Incrementer la version pour invalider l'ancien QR
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { workerQrVersion: room.workerQrVersion + 1 },
    });

    const qrPayload = generateWorkerRoomQr(updatedRoom.id, updatedRoom.workerQrVersion);

    await createAuditLog({
      actorId: req.userId,
      action: "REGENERATE_WORKER_QR",
      entity: "Room",
      entityId: roomId,
      metadata: {
        roomNumber: room.roomNumber,
        oldVersion: room.workerQrVersion,
        newVersion: updatedRoom.workerQrVersion,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        qrPayload,
        message: `QR employe regenere (version ${updatedRoom.workerQrVersion}). L'ancien QR est invalide.`,
      },
    });
  } catch (error) {
    next(error);
  }
};
