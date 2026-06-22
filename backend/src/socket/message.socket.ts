import { Server } from "socket.io";
import { AuthenticatedSocket } from "./authSocket.middleware";
import { GuestMessageService } from "../services/guestMessage.service";
import { ComplaintService } from "../services/complaint.service";

const guestMessageService = new GuestMessageService();
const complaintService = new ComplaintService();

/**
 * Enregistrer les handlers de messagerie sur un socket authentifie.
 */
export const registerMessageHandlers = (io: Server, socket: AuthenticatedSocket) => {

  // ── Auto-join rooms ────────────────────────────────────────────────

  if (socket.connectionType === "client" && socket.reservationId) {
    // Client rejoint la room de sa reservation
    const room = `guest_reservation_${socket.reservationId}`;
    socket.join(room);
    console.log(`[Socket] Client joined ${room}`);
  }

  if (socket.connectionType === "staff" && socket.userId) {
    // Staff rejoint sa room personnelle
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
    console.log(`[Socket] Staff ${socket.userId} joined ${userRoom}`);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Guest <-> Staff messaging (with translation)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Client envoie un message a la reception.
   * Payload: { message: string }
   */
  socket.on("guest:send_message", async (payload: { message: string }, callback?: (res: any) => void) => {
    try {
      if (socket.connectionType !== "client" || !socket.reservationId || !socket.roomId) {
        return callback?.({ success: false, error: "Non autorise." });
      }

      if (!payload.message || payload.message.trim().length === 0) {
        return callback?.({ success: false, error: "Message vide." });
      }

      if (payload.message.length > 2000) {
        return callback?.({ success: false, error: "Message trop long (max 2000)." });
      }

      // Creer le message (traduit automatiquement)
      const msg = await guestMessageService.createFromClient({
        message: payload.message.trim(),
        reservationId: socket.reservationId,
        roomId: socket.roomId,
      });

      // Recuperer le message complet pour le staff
      const fullMsg = await guestMessageService.getMessageById(msg.id);

      // Envoyer au client (confirmation)
      socket.emit("guest:new_message", {
        id: fullMsg.id,
        senderType: fullMsg.senderType,
        clientMessage: fullMsg.clientMessage,
        staffMessage: fullMsg.staffMessage,
        createdAt: fullMsg.createdAt,
      });

      // Broadcast a toutes les connexions staff dans la room de cette reservation
      io.to(`guest_reservation_${socket.reservationId}`).except(socket.id).emit("guest:new_message", {
        id: fullMsg.id,
        senderType: fullMsg.senderType,
        clientMessage: fullMsg.clientMessage,
        staffMessage: fullMsg.staffMessage,
        createdAt: fullMsg.createdAt,
        reservationId: socket.reservationId,
      });

      // Notifier tous les staff connectes qu'il y a un nouveau message
      io.emit("guest:conversation_updated", {
        reservationId: socket.reservationId,
      });

      callback?.({ success: true, data: msg });
    } catch (err: any) {
      console.error("[Socket] guest:send_message error:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  /**
   * Staff repond a un client.
   * Payload: { reservationId: string, message: string }
   */
  socket.on("staff:reply_guest", async (payload: { reservationId: string; message: string }, callback?: (res: any) => void) => {
    try {
      if (socket.connectionType !== "staff" || !socket.userId) {
        return callback?.({ success: false, error: "Non autorise." });
      }

      if (!payload.message || payload.message.trim().length === 0) {
        return callback?.({ success: false, error: "Message vide." });
      }

      // Recuperer le roomId
      const roomId = await guestMessageService.getReservationRoomId(payload.reservationId);
      if (!roomId) {
        return callback?.({ success: false, error: "Reservation introuvable." });
      }

      const msg = await guestMessageService.createFromStaff({
        message: payload.message.trim(),
        reservationId: payload.reservationId,
        roomId,
        userId: socket.userId,
      });

      const fullMsg = await guestMessageService.getMessageById(msg.id);

      // Envoyer au client en temps reel
      io.to(`guest_reservation_${payload.reservationId}`).emit("guest:new_message", {
        id: fullMsg.id,
        senderType: fullMsg.senderType,
        clientMessage: fullMsg.clientMessage,
        staffMessage: fullMsg.staffMessage,
        createdAt: fullMsg.createdAt,
        reservationId: payload.reservationId,
      });

      // Notifier la mise a jour
      io.emit("guest:conversation_updated", {
        reservationId: payload.reservationId,
      });

      callback?.({ success: true, data: msg });
    } catch (err: any) {
      console.error("[Socket] staff:reply_guest error:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  /**
   * Staff rejoint la room d'une conversation guest
   */
  socket.on("staff:join_conversation", (payload: { reservationId: string }) => {
    if (socket.connectionType === "staff") {
      const room = `guest_reservation_${payload.reservationId}`;
      socket.join(room);
      console.log(`[Socket] Staff joined conversation ${room}`);
    }
  });

  // ══════════════════════════════════════════════════════════════════
  //  Internal messaging (complaint-based, no translation)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Staff/employee envoie un message interne lie a une reclamation.
   * Payload: { complaintId: string, message: string }
   */
  socket.on("internal:send_message", async (payload: { complaintId: string; message: string }, callback?: (res: any) => void) => {
    try {
      if (socket.connectionType !== "staff" || !socket.userId || !socket.userRole) {
        return callback?.({ success: false, error: "Non autorise." });
      }

      if (!payload.message || payload.message.trim().length === 0) {
        return callback?.({ success: false, error: "Message vide." });
      }

      const msg = await complaintService.addMessage(
        payload.complaintId,
        socket.userId,
        socket.userRole,
        payload.message.trim()
      );

      // Envoyer au destinataire en temps reel
      io.to(`complaint_${payload.complaintId}`).emit("internal:new_message", {
        ...msg,
        complaintId: payload.complaintId,
      });

      // Aussi notifier directement l'utilisateur (pour la liste de messages)
      if (msg.receiver) {
        io.to(`user_${msg.receiver.id}`).emit("internal:new_message", {
          ...msg,
          complaintId: payload.complaintId,
        });
      }

      callback?.({ success: true, data: msg });
    } catch (err: any) {
      console.error("[Socket] internal:send_message error:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  /**
   * Staff rejoint la room d'une reclamation
   */
  socket.on("internal:join_complaint", (payload: { complaintId: string }) => {
    if (socket.connectionType === "staff") {
      const room = `complaint_${payload.complaintId}`;
      socket.join(room);
      console.log(`[Socket] Staff joined complaint room ${room}`);
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] ${socket.connectionType} disconnected: ${reason}`);
  });
};
