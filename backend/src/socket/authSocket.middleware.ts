import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { verifyClientRoomToken } from "../services/qrToken.service";

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface StaffPayload {
  userId: string;
  role: string;
}

interface ClientPayload {
  reservationId: string;
  roomId: string;
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  reservationId?: string;
  roomId?: string;
  connectionType: "staff" | "client";
}

// -----------------------------------------------------------
// Middleware
// -----------------------------------------------------------

/**
 * Middleware Socket.IO pour authentifier les connexions.
 *
 * Staff : envoie { token: "jwt..." } dans auth
 * Client : envoie { clientRoomToken: "jwt..." } dans auth
 */
export const authSocketMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const { token, clientRoomToken } = socket.handshake.auth;

    // ── Staff auth (JWT Bearer) ────────────────────────────────
    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as StaffPayload;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.connectionType = "staff";
      return next();
    }

    // ── Client auth (X-Client-Room-Token) ──────────────────────
    if (clientRoomToken) {
      const result = await verifyClientRoomToken(clientRoomToken);
      socket.reservationId = result.reservationId;
      socket.roomId = result.roomId;
      socket.connectionType = "client";
      return next();
    }

    return next(new Error("Authentification requise."));
  } catch (err: any) {
    return next(new Error(err.message || "Authentification echouee."));
  }
};
