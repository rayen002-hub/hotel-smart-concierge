import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { UserRole, Department } from "@prisma/client";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

const SALT_ROUNDS = 10;
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Service de gestion des employes.
 */
export class EmployeeService {
  /**
   * Lister les employes avec filtre par departement.
   */
  async list(params: {
    page: number;
    limit: number;
    department?: Department;
    allowedDepartments?: Department[];
  }) {
    const { page, limit, department, allowedDepartments } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.EMPLOYEE,
      employeeProfile: { isNot: null },
    };

    if (department) {
      where.employeeProfile = { department };
    } else if (allowedDepartments && allowedDepartments.length > 0) {
      where.employeeProfile = { department: { in: allowedDepartments } };
    }

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          employeeProfile: {
            select: {
              id: true,
              department: true,
              isAvailable: true,
              lastSeenAt: true,
              lastLoginAt: true,
              lastLogoutAt: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creer un employe (User + EmployeeProfile).
   */
  async create(
    data: {
      name: string;
      email: string;
      password: string;
      department: Department;
    },
    actorId: string
  ) {
    // Verifier unicite email
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(`Un utilisateur avec l'email ${data.email} existe deja.`, 409);
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: UserRole.EMPLOYEE,
        employeeProfile: {
          create: {
            department: data.department,
            isAvailable: true,
            createdById: actorId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        employeeProfile: {
          select: {
            id: true,
            department: true,
            isAvailable: true,
          },
        },
      },
    });

    await createAuditLog({
      actorId,
      action: "CREATE_EMPLOYEE",
      entity: "User",
      entityId: user.id,
      metadata: {
        name: data.name,
        email: data.email,
        department: data.department,
      },
    });

    return user;
  }

  /**
   * Modifier un employe (disponibilite, departement).
   */
  async update(
    userId: string,
    data: { isAvailable?: boolean; department?: Department },
    actorId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });

    if (!user) {
      throw new AppError("Employe introuvable.", 404);
    }

    if (!user.employeeProfile) {
      throw new AppError("Cet utilisateur n'a pas de profil employe.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        employeeProfile: {
          update: {
            ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
            ...(data.department && { department: data.department }),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeProfile: {
          select: {
            id: true,
            department: true,
            isAvailable: true,
            lastSeenAt: true,
          },
        },
      },
    });

    await createAuditLog({
      actorId,
      action: "UPDATE_EMPLOYEE",
      entity: "User",
      entityId: userId,
      metadata: { changes: data },
    });

    return updated;
  }

  /**
   * Lister les employes en ligne (lastSeenAt < 2 minutes).
   */
  async listOnline(allowedDepartments?: Department[]) {
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);

    const where: any = {
      role: UserRole.EMPLOYEE,
      employeeProfile: {
        lastSeenAt: { gte: threshold },
        isAvailable: true,
      },
    };

    if (allowedDepartments && allowedDepartments.length > 0) {
      where.employeeProfile.department = { in: allowedDepartments };
    }

    const employees = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        employeeProfile: {
          select: {
            department: true,
            isAvailable: true,
            lastSeenAt: true,
          },
        },
      },
    });

    return employees;
  }
}
