import { Request, Response, NextFunction } from "express";
import { verifyClientRoomToken } from "../services/qrToken.service";
import { ComplaintService } from "../services/complaint.service";

const complaintService = new ComplaintService();

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
 * POST /api/public/complaints
 * Creer une reclamation depuis la PWA client.
 */
export const createPublicComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

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

/**
 * GET /api/public/complaints
 * Lister les reclamations du client (reservation liee au token).
 */
export const listPublicComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

    const complaints = await complaintService.listByReservation(roomAccess.reservationId);

    res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/complaints/:id/confirm
 * Confirmer une reclamation resolue.
 */
export const confirmPublicComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

    const complaint = await complaintService.confirmComplaint(
      req.params.id as string,
      roomAccess.reservationId
    );

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/complaints/:id/reopen
 * Reouvrir une reclamation resolue.
 */
export const reopenPublicComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomAccess = await extractRoomAccess(req, res);
    if (!roomAccess) return;

    const complaint = await complaintService.reopenComplaint(
      req.params.id as string,
      roomAccess.reservationId,
      req.body.comment
    );

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};
