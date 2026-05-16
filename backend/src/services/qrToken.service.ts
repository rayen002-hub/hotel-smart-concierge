import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "./auth.service";
import { ReservationStatus } from "@prisma/client";

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface ClientRoomTokenPayload {
  type: "CLIENT_ROOM_ACCESS";
  reservationId: string;
  roomId: string;
}

interface WorkerRoomTokenPayload {
  type: "WORKER_ROOM_SCAN";
  roomId: string;
  workerQrVersion: number;
}

// -----------------------------------------------------------
// Client Room Access Token
// -----------------------------------------------------------

/**
 * Generer un token JWT pour l'acces client a la PWA chambre.
 * Le token expire a la date de checkout.
 */
export const generateClientRoomToken = (
  reservationId: string,
  roomId: string,
  checkOutDate: Date
): string => {
  const payload: ClientRoomTokenPayload = {
    type: "CLIENT_ROOM_ACCESS",
    reservationId,
    roomId,
  };

  // Calculer le temps restant jusqu'au checkout (en secondes)
  const expiresInSeconds = Math.floor(
    (checkOutDate.getTime() - Date.now()) / 1000
  );

  if (expiresInSeconds <= 0) {
    throw new AppError("La date de checkout est deja passee.", 400);
  }

  return jwt.sign(payload, env.CLIENT_QR_SECRET, {
    expiresIn: expiresInSeconds,
  } as jwt.SignOptions);
};

/**
 * Verifier et valider un token d'acces client.
 */
export const verifyClientRoomToken = async (token: string) => {
  let decoded: ClientRoomTokenPayload;

  try {
    decoded = jwt.verify(token, env.CLIENT_QR_SECRET) as ClientRoomTokenPayload;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Le lien d'acces a expire (checkout depasse).", 401);
    }
    throw new AppError("Token d'acces invalide.", 401);
  }

  if (decoded.type !== "CLIENT_ROOM_ACCESS") {
    throw new AppError("Type de token invalide.", 401);
  }

  // Verifier la reservation
  const reservation = await prisma.reservation.findUnique({
    where: { id: decoded.reservationId },
    include: { room: true },
  });

  if (!reservation) {
    throw new AppError("Reservation introuvable.", 404);
  }

  if (reservation.status !== ReservationStatus.CHECKED_IN) {
    throw new AppError("La reservation n'est pas en cours (CHECKED_IN requis).", 403);
  }

  if (reservation.roomId !== decoded.roomId) {
    throw new AppError("La chambre ne correspond pas a la reservation.", 403);
  }

  // Verifier que le checkout n'est pas depasse
  if (new Date() > reservation.checkOutDate) {
    throw new AppError("La date de checkout est depassee.", 403);
  }

  return {
    reservationId: decoded.reservationId,
    roomId: decoded.roomId,
    room: reservation.room
      ? { roomNumber: reservation.room.roomNumber, type: reservation.room.type }
      : null,
    guestFirstName: reservation.guestFirstName,
    guestLastName: reservation.guestLastName,
  };
};

// -----------------------------------------------------------
// Worker Room QR Token
// -----------------------------------------------------------

/**
 * Generer un token QR pour le scan employe (entree/sortie chambre).
 * Ce token n'a pas d'expiration mais est versionne.
 */
export const generateWorkerRoomQr = (roomId: string, workerQrVersion: number): string => {
  const payload: WorkerRoomTokenPayload = {
    type: "WORKER_ROOM_SCAN",
    roomId,
    workerQrVersion,
  };

  // Pas d'expiration : le token est invalide via la version
  return jwt.sign(payload, env.WORKER_QR_SECRET);
};

/**
 * Verifier et valider un token QR employe.
 */
export const verifyWorkerRoomQr = async (token: string) => {
  let decoded: WorkerRoomTokenPayload;

  try {
    decoded = jwt.verify(token, env.WORKER_QR_SECRET) as WorkerRoomTokenPayload;
  } catch {
    throw new AppError("QR code invalide.", 401);
  }

  if (decoded.type !== "WORKER_ROOM_SCAN") {
    throw new AppError("Type de QR invalide.", 401);
  }

  // Verifier la chambre
  const room = await prisma.room.findUnique({
    where: { id: decoded.roomId },
  });

  if (!room) {
    throw new AppError("Chambre introuvable.", 404);
  }

  // Verifier la version du QR
  if (room.workerQrVersion !== decoded.workerQrVersion) {
    throw new AppError("QR code obsolete. Un nouveau QR a ete genere.", 403);
  }

  return {
    roomId: room.id,
    roomNumber: room.roomNumber,
    floor: room.floor,
    type: room.type,
    status: room.status,
  };
};
