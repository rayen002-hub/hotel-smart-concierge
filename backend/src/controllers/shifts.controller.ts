import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ShiftsService } from "../services/shifts.service";
import { WorkerShift, Department, UserRole } from "@prisma/client";
import { AppError } from "../services/auth.service";
import prisma from "../config/prisma";

const shiftsService = new ShiftsService();

/**
 * GET /api/shifts
 * Get workers + shifts for the manager's department on a given business day.
 */
export const getShifts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const managerId = req.userId as string;
    const businessDay = req.query.businessDay as string | undefined;

    const dept = await resolveManagerDepartment(managerId, req.userRole as UserRole | undefined);

    const result = await shiftsService.getShiftsForDay({
      managerDepartment: dept,
      businessDay,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/shifts
 * Upsert shift for a worker.
 * Body: { workerId, shift, businessDay? }
 */
export const upsertShift = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const managerId = req.userId as string;
    const { workerId, shift, businessDay } = req.body as {
      workerId: string;
      shift: WorkerShift;
      businessDay?: string;
    };

    const dept = await resolveManagerDepartment(managerId, req.userRole as UserRole | undefined);

    const result = await shiftsService.upsertShift({
      workerId,
      shift,
      businessDay,
      createdById: managerId,
      managerDepartment: dept,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Determine the department the manager is responsible for.
 * HOUSEKEEPING_MANAGER → HOUSEKEEPING, MAINTENANCE_MANAGER → MAINTENANCE
 * ADMIN → forbidden from this endpoint (use the housekeeping manager)
 */
async function resolveManagerDepartment(
  userId: string,
  userRole?: UserRole
): Promise<Department> {
  if (userRole === UserRole.HOUSEKEEPING_MANAGER) return Department.HOUSEKEEPING;
  if (userRole === UserRole.MAINTENANCE_MANAGER) return Department.MAINTENANCE;

  // For admin testing, look up employee profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employeeProfile: true },
  });

  if (user?.employeeProfile?.department) {
    return user.employeeProfile.department as Department;
  }

  throw new AppError("Rôle non autorisé pour la gestion des plannings.", 403);
}
