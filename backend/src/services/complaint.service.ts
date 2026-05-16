import prisma from "../config/prisma";
import { ComplaintStatus } from "@prisma/client";
import { AIService, AIAnalysisResult } from "./ai.service";
import { createAuditLog } from "../utils/audit";

const aiService = new AIService();

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
}
