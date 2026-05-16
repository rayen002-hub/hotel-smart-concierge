import { Request, Response, NextFunction } from "express";
import { verifyClientRoomToken } from "../services/qrToken.service";
import { ComplaintService } from "../services/complaint.service";

const complaintService = new ComplaintService();

/**
 * POST /api/public/complaints
 * Creer une reclamation depuis la PWA client.
 * Le token est dans le header X-Client-Room-Token.
 */
export const createPublicComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Recuperer et verifier le token client
    const token = req.headers["x-client-room-token"] as string;

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Token d'acces chambre manquant (header X-Client-Room-Token).",
      });
      return;
    }

    const roomAccess = await verifyClientRoomToken(token);

    // Creer la reclamation
    const complaint = await complaintService.createFromClient({
      message: req.body.message,
      reservationId: roomAccess.reservationId,
      roomId: roomAccess.roomId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: complaint.id,
        category: complaint.category,
        status: complaint.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
