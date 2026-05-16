import prisma from "../config/prisma";
import { ComplaintStatus } from "@prisma/client";
import { AIService, AIAnalysisResult } from "./ai.service";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

const aiService = new AIService();

// Champs visibles par le client (jamais de messages internes)
const CLIENT_COMPLAINT_SELECT = {
  id: true,
  originalMessage: true,
  category: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  confirmedAt: true,
  reopenedAt: true,
};

/**
 * Service de gestion des reclamations.
 */
export class ComplaintService {
  /**
   * Creer une reclamation depuis le client (public).
   * Appelle le service IA pour analyser le message.
   */
  async createFromClient(params: {
    message: string;
    reservationId: string;
    roomId: string;
  }) {
    // Analyser le message via le service IA
    const analysis: AIAnalysisResult = await aiService.analyzeComplaint(params.message);

    // Creer la reclamation
    const complaint = await prisma.complaint.create({
      data: {
        reservationId: params.reservationId,
        roomId: params.roomId,
        originalMessage: params.message,
        detectedLanguage: analysis.detectedLanguage,
        normalizedMessageEn: analysis.normalizedMessageEn,
        staffMessage: analysis.staffMessage,
        category: analysis.category,
        status: ComplaintStatus.PENDING,
      },
      select: {
        id: true,
        category: true,
        status: true,
        detectedLanguage: true,
        staffMessage: true,
        createdAt: true,
      },
    });

    // Audit log (pas d'actorId car c'est le client)
    await createAuditLog({
      actorId: null,
      action: "CREATE_COMPLAINT",
      entity: "Complaint",
      entityId: complaint.id,
      metadata: {
        reservationId: params.reservationId,
        roomId: params.roomId,
        category: complaint.category,
        source: "public_client",
      },
    });

    return complaint;
  }

  /**
   * Lister les reclamations d'une reservation (vue client).
   * Ne retourne jamais les messages internes.
   */
  async listByReservation(reservationId: string) {
    const complaints = await prisma.complaint.findMany({
      where: { reservationId },
      select: CLIENT_COMPLAINT_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return complaints;
  }

  /**
   * Confirmer une reclamation resolue (action client).
   * Autorise seulement si status = RESOLVED.
   */
  async confirmComplaint(complaintId: string, reservationId: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new AppError("Reclamation introuvable.", 404);
    }

    if (complaint.reservationId !== reservationId) {
      throw new AppError("Acces refuse a cette reclamation.", 403);
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new AppError(
        `Impossible de confirmer. Statut actuel : ${complaint.status}. Seules les reclamations RESOLVED peuvent etre confirmees.`,
        400
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      select: CLIENT_COMPLAINT_SELECT,
    });

    await createAuditLog({
      actorId: null,
      action: "CONFIRM_COMPLAINT",
      entity: "Complaint",
      entityId: complaintId,
      metadata: { source: "public_client" },
    });

    return updated;
  }

  /**
   * Reouvrir une reclamation resolue (action client).
   * Autorise seulement si status = RESOLVED.
   */
  async reopenComplaint(
    complaintId: string,
    reservationId: string,
    comment?: string
  ) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new AppError("Reclamation introuvable.", 404);
    }

    if (complaint.reservationId !== reservationId) {
      throw new AppError("Acces refuse a cette reclamation.", 403);
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new AppError(
        `Impossible de reouvrir. Statut actuel : ${complaint.status}. Seules les reclamations RESOLVED peuvent etre reouvertes.`,
        400
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.REOPENED,
        reopenedAt: new Date(),
      },
      select: CLIENT_COMPLAINT_SELECT,
    });

    await createAuditLog({
      actorId: null,
      action: "REOPEN_COMPLAINT",
      entity: "Complaint",
      entityId: complaintId,
      metadata: {
        source: "public_client",
        clientComment: comment || null,
      },
    });

    return updated;
  }
}
