import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ComplaintService } from "../services/complaint.service";
import { ComplaintCategory, ComplaintStatus, UserRole } from "@prisma/client";
import { getViewableCategories } from "../utils/permissions";
import { AppError } from "../services/auth.service";

const complaintService = new ComplaintService();

/**
 * GET /api/complaints
 * Lister les reclamations (filtrees par role).
 */
export const listStaffComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ComplaintStatus | undefined;
    const category = req.query.category as ComplaintCategory | undefined;
    const roomId = req.query.roomId as string | undefined;

    // Determiner les categories visibles selon le role
    const userRole = req.userRole as UserRole;
    const allowedCategories = getViewableCategories({
      id: req.userId as string,
      role: userRole,
    });

    // Si un filtre categorie est fourni, verifier qu'il est autorise
    if (category && !allowedCategories.includes(category)) {
      res.status(403).json({
        success: false,
        error: "Vous n'avez pas acces a cette categorie de reclamations.",
      });
      return;
    }

    const result = await complaintService.listForStaff({
      page,
      limit,
      status,
      category,
      roomId,
      // Pour ADMIN et RECEPTIONIST, pas de filtre (ils voient tout)
      allowedCategories:
        userRole === UserRole.ADMIN || userRole === UserRole.RECEPTIONIST
          ? undefined
          : allowedCategories,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id
 * Detail d'une reclamation.
 */
export const getStaffComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaint = await complaintService.getById(req.params.id as string);

    // Verifier que le role a acces a cette categorie
    const userRole = req.userRole as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.RECEPTIONIST) {
      const allowedCategories = getViewableCategories({
        id: req.userId as string,
        role: userRole,
      });
      if (!allowedCategories.includes(complaint.category)) {
        res.status(403).json({
          success: false,
          error: "Vous n'avez pas acces a cette reclamation.",
        });
        return;
      }
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/complaints/:id/category
 * Corriger la categorie d'une reclamation.
 */
export const updateStaffComplaintCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const newCategory = req.body.category as ComplaintCategory;
    const userRole = req.userRole as UserRole;

    // Verifier les permissions de correction
    if (
      userRole === UserRole.MAINTENANCE_MANAGER &&
      newCategory !== ComplaintCategory.MAINTENANCE
    ) {
      throw new AppError(
        "En tant que responsable maintenance, vous ne pouvez corriger que vers MAINTENANCE.",
        403
      );
    }

    if (
      userRole === UserRole.HOUSEKEEPING_MANAGER &&
      newCategory !== ComplaintCategory.HOUSEKEEPING
    ) {
      throw new AppError(
        "En tant que responsable housekeeping, vous ne pouvez corriger que vers HOUSEKEEPING.",
        403
      );
    }

    const updated = await complaintService.updateCategory(
      req.params.id as string,
      newCategory,
      req.userId as string
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/complaints/:id/assign
 * Assigner une reclamation a un employe.
 */
export const assignStaffComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintId = req.params.id as string;
    const employeeId = req.body.employeeId as string;
    const userRole = req.userRole as UserRole;
    const userId = req.userId as string;

    // Verifier que l'utilisateur a le droit d'assigner (selon la categorie de la reclamation)
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.RECEPTIONIST) {
      const complaint = await complaintService.getById(complaintId);
      
      if (userRole === UserRole.MAINTENANCE_MANAGER && complaint.category !== ComplaintCategory.MAINTENANCE) {
        throw new AppError("Vous ne pouvez assigner que des reclamations MAINTENANCE.", 403);
      }
      if (userRole === UserRole.HOUSEKEEPING_MANAGER && complaint.category !== ComplaintCategory.HOUSEKEEPING) {
        throw new AppError("Vous ne pouvez assigner que des reclamations HOUSEKEEPING.", 403);
      }
    }

    const updated = await complaintService.assignComplaint(
      complaintId,
      employeeId,
      userId
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id/messages
 * Recuperer les messages internes d'une reclamation (Staff).
 */
export const getStaffMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintId = req.params.id as string;
    const userRole = req.userRole as UserRole;

    const complaint = await complaintService.getById(complaintId);

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.RECEPTIONIST) {
      const allowedCategories = getViewableCategories({
        id: req.userId as string,
        role: userRole,
      });
      if (!allowedCategories.includes(complaint.category)) {
        throw new AppError("Vous n'avez pas acces a cette reclamation.", 403);
      }
    }

    const messages = await complaintService.getMessages(complaintId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/messages
 * Ajouter un message interne a une reclamation (Staff).
 */
export const addStaffMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintId = req.params.id as string;
    const userRole = req.userRole as UserRole;
    const userId = req.userId as string;
    const { message } = req.body;

    const complaint = await complaintService.getById(complaintId);

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.RECEPTIONIST) {
      const allowedCategories = getViewableCategories({
        id: req.userId as string,
        role: userRole,
      });
      if (!allowedCategories.includes(complaint.category)) {
        throw new AppError("Vous n'avez pas acces a cette reclamation.", 403);
      }
    }

    const newMessage = await complaintService.addMessage(
      complaintId,
      userId,
      userRole,
      message
    );

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};
