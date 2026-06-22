import { Router, Request, Response, NextFunction } from "express";
import { verifyClientRoomToken } from "../services/qrToken.service";
import { GuestMessageService } from "../services/guestMessage.service";

const router = Router();
const guestMessageService = new GuestMessageService();

/**
 * Extraire et verifier le token client depuis le header.
 */
const extractRoomAccess = async (req: Request, res: Response) => {
  const token = req.headers["x-client-room-token"] as string;

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Token d'acces chambre manquant (header X-Client-Room-Token).",
    });
    return null;
  }

  return await verifyClientRoomToken(token);
};

/**
 * GET /api/public/messages
 * Lister les messages de la conversation client-reception.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

    const messages = await guestMessageService.listByReservation(roomAccess.reservationId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/public/messages
 * Envoyer un message depuis la PWA client.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

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

    const msg = await guestMessageService.createFromClient({
      message: message.trim(),
      reservationId: roomAccess.reservationId,
      roomId: roomAccess.roomId,
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
