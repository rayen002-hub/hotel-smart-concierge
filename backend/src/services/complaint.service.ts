import prisma from "../config/prisma";
import { ComplaintStatus, ComplaintCategory } from "@prisma/client";
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

  // -----------------------------------------------------------
  // Staff methods
  // -----------------------------------------------------------

  /**
   * Lister les reclamations pour le staff avec filtres et pagination.
   * Le filtrage par categorie depend du role.
   */
  async listForStaff(params: {
    page: number;
    limit: number;
    status?: ComplaintStatus;
    category?: ComplaintCategory;
    roomId?: string;
    allowedCategories?: ComplaintCategory[];
  }) {
    const { page, limit, status, category, roomId, allowedCategories } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;

    // Filtrer par categorie autorisee selon le role
    if (category) {
      where.category = category;
    } else if (allowedCategories && allowedCategories.length > 0) {
      where.category = { in: allowedCategories };
    }

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          room: { select: { id: true, roomNumber: true, type: true } },
          reservation: {
            select: {
              id: true,
              reservationNumber: true,
              guestFirstName: true,
              guestLastName: true,
            },
          },
          assignedTo: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return {
      data: complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Recuperer une reclamation par ID (vue staff).
   */
  async getById(complaintId: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        room: { select: { id: true, roomNumber: true, type: true, floor: true } },
        reservation: {
          select: {
            id: true,
            reservationNumber: true,
            guestFirstName: true,
            guestLastName: true,
          },
        },
        assignedTo: { select: { id: true, name: true, role: true } },
        assignedBy: { select: { id: true, name: true, role: true } },
        interventionLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            employee: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!complaint) {
      throw new AppError("Reclamation introuvable.", 404);
    }

    return complaint;
  }

  /**
   * Corriger la categorie d'une reclamation (staff).
   */
  async updateCategory(
    complaintId: string,
    newCategory: ComplaintCategory,
    actorId: string
  ) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new AppError("Reclamation introuvable.", 404);
    }

    const oldCategory = complaint.category;

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { category: newCategory },
      include: {
        room: { select: { id: true, roomNumber: true } },
      },
    });

    await createAuditLog({
      actorId,
      action: "UPDATE_COMPLAINT_CATEGORY",
      entity: "Complaint",
      entityId: complaintId,
      metadata: {
        oldCategory,
        newCategory,
      },
    });

    return updated;
  }

  /**
   * Assigner une reclamation a un employe.
   */
  async assignComplaint(
    complaintId: string,
    employeeId: string,
    assignedById: string
  ) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new AppError("Reclamation introuvable.", 404);
    }

    const assignableStatuses: ComplaintStatus[] = [
      ComplaintStatus.PENDING,
      ComplaintStatus.REOPENED,
      ComplaintStatus.NEEDS_REVIEW,
    ];

    if (!assignableStatuses.includes(complaint.status)) {
      throw new AppError(`Impossible d'assigner une reclamation avec le statut ${complaint.status}.`, 400);
    }

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: { employeeProfile: true },
    });

    if (!employee || !employee.employeeProfile) {
      throw new AppError("Employe introuvable ou profil employe manquant.", 404);
    }

    const empDept = employee.employeeProfile.department;
    const category = complaint.category;

    // Verifier le departement de l'employe par rapport a la categorie
    if (category === "MAINTENANCE" && empDept !== "MAINTENANCE") {
      throw new AppError("Les reclamations MAINTENANCE doivent etre assignees au departement MAINTENANCE.", 400);
    } else if (category === "HOUSEKEEPING" && empDept !== "HOUSEKEEPING") {
      throw new AppError("Les reclamations HOUSEKEEPING doivent etre assignees au departement HOUSEKEEPING.", 400);
    } else if (
      ["RECEPTION", "RESTAURANT", "COMPLAINT", "OTHER"].includes(category) &&
      !["GENERAL", "RECEPTION"].includes(empDept)
    ) {
      throw new AppError(`Les reclamations de categorie ${category} doivent etre assignees a GENERAL ou RECEPTION.`, 400);
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedToId: employeeId,
        assignedById,
        status: ComplaintStatus.ASSIGNED,
      },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });

    await createAuditLog({
      actorId: assignedById,
      action: "ASSIGN_COMPLAINT",
      entity: "Complaint",
      entityId: complaintId,
      metadata: {
        assignedToId: employeeId,
      },
    });

    return updated;
  }
}

