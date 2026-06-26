import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { authSocketMiddleware, AuthenticatedSocket } from "./authSocket.middleware";
import { registerMessageHandlers } from "./message.socket";

let io: Server;

/**
 * Initialiser Socket.IO sur le serveur HTTP existant.
 */
export const initSocketIO = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow no-origin requests (server-to-server, health checks)
        if (!origin) return callback(null, true);
        // Accept known origins
        const allowed = [
          env.SOCKET_CORS_ORIGIN,
          env.FRONTEND_URL,
          "https://hotel-smart-concierge.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000",
        ].filter(Boolean);
        if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        callback(new Error(`Socket CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });


  // ── Auth middleware ─────────────────────────────────────────────────
  io.use(authSocketMiddleware as any);

  // ── Connection handler ──────────────────────────────────────────────
  io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(
      `[Socket] New ${authSocket.connectionType} connection: ${socket.id}` +
      (authSocket.userId ? ` (user: ${authSocket.userId})` : '') +
      (authSocket.reservationId ? ` (reservation: ${authSocket.reservationId})` : '')
    );

    // Enregistrer les handlers de messagerie
    registerMessageHandlers(io, authSocket);
  });

  console.log("[Socket.IO] Initialized successfully");
  return io;
};

/**
 * Recuperer l'instance Socket.IO (pour emettre depuis les routes REST).
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocketIO first.");
  }
  return io;
};
