import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { EmployeeService } from "../services/employee.service";
import { Department, UserRole } from "@prisma/client";
import { getManagedDepartments } from "../utils/permissions";
import { AppError } from "../services/auth.service";

const employeeService = new EmployeeService();

/**
 * Obtenir les departements autorises selon le role.
 * Retourne undefined pour ADMIN (pas de filtre).
 */
const getAllowedDepts = (req: AuthRequest): Department[] | undefined => {
  const role = req.userRole as UserRole;
  if (role === UserRole.ADMIN) return undefined;
  return getManagedDepartments({ id: req.userId as string, role });
};

/**
 * GET /api/employees
 */
export const listEmployees = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const department = req.query.department as Department | undefined;

    const allowedDepartments = getAllowedDepts(req);

    // Verifier que le filtre departement est autorise
    if (department && allowedDepartments && !allowedDepartments.includes(department)) {
      res.status(403).json({
        success: false,
        error: "Vous n'avez pas acces a ce departement.",
      });
      return;
    }

    const result = await employeeService.list({
      page,
      limit,
      department,
      allowedDepartments,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employees
 */
export const createEmployee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, department } = req.body;
    const role = req.userRole as UserRole;

    // Verifier que le manager cree dans son departement
    if (role === UserRole.MAINTENANCE_MANAGER && department !== Department.MAINTENANCE) {
      throw new AppError(
        "Vous ne pouvez creer des employes que dans le departement MAINTENANCE.",
        403
      );
    }
    if (role === UserRole.HOUSEKEEPING_MANAGER && department !== Department.HOUSEKEEPING) {
      throw new AppError(
        "Vous ne pouvez creer des employes que dans le departement HOUSEKEEPING.",
        403
      );
    }

    const employee = await employeeService.create(
      { name, email, password, department },
      req.userId as string
    );

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/employees/:id
 */
export const updateEmployee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const { isAvailable, department } = req.body;
    const role = req.userRole as UserRole;

    // Verifier les permissions du manager sur l'employe
    if (role !== UserRole.ADMIN) {
      const user = await import("../config/prisma").then((m) =>
        m.default.user.findUnique({
          where: { id: userId },
          include: { employeeProfile: true },
        })
      );

      if (!user?.employeeProfile) {
        throw new AppError("Employe introuvable.", 404);
      }

      const allowedDepts = getManagedDepartments({
        id: req.userId as string,
        role,
      });

      if (!allowedDepts.includes(user.employeeProfile.department)) {
        throw new AppError("Vous ne pouvez pas gerer cet employe.", 403);
      }
    }

    const updated = await employeeService.update(
      userId,
      { isAvailable, department },
      req.userId as string
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/online
 */
export const listOnlineEmployees = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const allowedDepartments = getAllowedDepts(req);
    const employees = await employeeService.listOnline(allowedDepartments);

    res.status(200).json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    next(error);
  }
};
