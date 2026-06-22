import { Router, Response, NextFunction } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { GuestMessageService } from "../services/guestMessage.service";

const router = Router();
const guestMessageService = new GuestMessageService();

// Tous les endpoints requirent authentification + role RECEPTIONIST (ou ADMIN)
router.use(authMiddleware);
router.use(requireRole("RECEPTIONIST"));

/**
 * GET /api/guest-messages
 * Liste des conversations groupees par reservation.
 */
router.get("/", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversations = await guestMessageService.listConversations();

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/guest-messages/:reservationId
 * Messages d'une conversation specifique.
 */
router.get("/:reservationId", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reservationId } = req.params;
    const messages = await guestMessageService.listByReservation(reservationId as string);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/guest-messages/:reservationId/reply
 * Repondre a un client.
 */
router.post("/:reservationId/reply", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reservationId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Le message ne peut pas etre vide.",
      });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({
        success: false,
        error: "Le message ne peut pas depasser 2000 caracteres.",
      });
      return;
    }

    // Recuperer le roomId de la reservation
    const roomId = await guestMessageService.getReservationRoomId(reservationId as string);
    if (!roomId) {
      res.status(404).json({
        success: false,
        error: "Reservation introuvable ou pas de chambre assignee.",
      });
      return;
    }

    const msg = await guestMessageService.createFromStaff({
      message: message.trim(),
      reservationId: reservationId as string,
      roomId,
      userId: req.userId!,
    });

    res.status(201).json({
      success: true,
      data: msg,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
