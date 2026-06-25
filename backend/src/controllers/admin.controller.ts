import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/prisma";
import { UserRole, Department, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// ─── helpers ────────────────────────────────────────────────────────────────

/** Strip passwordHash from any user object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitize = (u: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = u;
  return safe;
};

const roleValues = Object.values(UserRole);
const deptValues = Object.values(Department);

// ─── LIST USERS ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Query: search, role, department, isActive, page, limit
 */
export const adminListUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const roleFilter = req.query.role as UserRole | undefined;
    const deptFilter = req.query.department as Department | undefined;
    const isActiveRaw = req.query.isActive as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;

    const isActiveFilter =
      isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;

    const where: Prisma.UserWhereInput = {};
    if (typeof isActiveFilter === "boolean") where.isActive = isActiveFilter;
    if (roleFilter && roleValues.includes(roleFilter)) where.role = roleFilter;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (deptFilter && deptValues.includes(deptFilter)) {
      where.employeeProfile = { department: deptFilter };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employeeProfile: {
            select: {
              department: true,
              isAvailable: true,
              lastSeenAt: true,
              lastLoginAt: true,
            },
          },
        },
      }),
    ]);

    const data = users.map(sanitize);

    res.status(200).json({
      success: true,
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE USER ─────────────────────────────────────────────────────────────

/**
 * POST /api/admin/users
 * Body: name, email, password, role, department? (required for EMPLOYEE)
 */
export const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role, department } = req.body as {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      department?: Department;
    };

    if (!roleValues.includes(role)) {
      res.status(400).json({ success: false, error: "Rôle invalide." });
      return;
    }

    if (role === UserRole.EMPLOYEE && (!department || !deptValues.includes(department))) {
      res.status(400).json({
        success: false,
        error: "Le département est requis pour un EMPLOYEE.",
      });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email déjà utilisé." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createData: Prisma.UserCreateInput = {
      name,
      email,
      passwordHash,
      role,
      isActive: true,
    };

    if (role === UserRole.EMPLOYEE && department) {
      createData.employeeProfile = {
        create: { department },
      };
    }

    const user = await prisma.user.create({
      data: createData,
      include: {
        employeeProfile: {
          select: { department: true, isAvailable: true },
        },
      },
    });

    res.status(201).json({ success: true, data: sanitize(user) });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE USER ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id
 * Body: name?, email?, role?, department?, isAvailable?, password?
 */
export const adminUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const { name, email, role, department, isAvailable, password } = req.body as {
      name?: string;
      email?: string;
      role?: UserRole;
      department?: Department;
      isAvailable?: boolean;
      password?: string;
    };

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Utilisateur introuvable." });
      return;
    }

    if (role && !roleValues.includes(role)) {
      res.status(400).json({ success: false, error: "Rôle invalide." });
      return;
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        res.status(409).json({ success: false, error: "Email déjà utilisé." });
        return;
      }
    }

    const userUpdateData: Prisma.UserUpdateInput = {};
    if (name) userUpdateData.name = name;
    if (email) userUpdateData.email = email;
    if (role) userUpdateData.role = role;
    if (password && password.length >= 6) {
      userUpdateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const effectiveRole = role ?? existing.role;
    const needsProfile = effectiveRole === UserRole.EMPLOYEE;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: userUpdateData });

      if (needsProfile) {
        const profileData: Prisma.EmployeeProfileUpdateInput = {};
        if (department && deptValues.includes(department)) profileData.department = department;
        if (typeof isAvailable === "boolean") profileData.isAvailable = isAvailable;

        if (existing.employeeProfile) {
          if (Object.keys(profileData).length > 0) {
            await tx.employeeProfile.update({ where: { userId }, data: profileData });
          }
        } else if (department) {
          await tx.employeeProfile.create({
            data: { userId, department, isAvailable: isAvailable ?? true },
          });
        }
      }
    });

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employeeProfile: {
          select: { department: true, isAvailable: true, lastSeenAt: true },
        },
      },
    });

    res.status(200).json({ success: true, data: sanitize(updated) });
  } catch (error) {
    next(error);
  }
};

// ─── DEACTIVATE USER ─────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id/deactivate
 */
export const adminDeactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const adminId = (req as AuthRequest).userId;

    if (userId === adminId) {
      res.status(400).json({
        success: false,
        error: "Vous ne pouvez pas vous désactiver vous-même.",
      });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: "Utilisateur introuvable." });
      return;
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    res.status(200).json({ success: true, message: "Utilisateur désactivé." });
  } catch (error) {
    next(error);
  }
};

// ─── REACTIVATE USER ─────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id/reactivate
 */
export const adminReactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id as string;

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: "Utilisateur introuvable." });
      return;
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    res.status(200).json({ success: true, message: "Utilisateur réactivé." });
  } catch (error) {
    next(error);
  }
};
