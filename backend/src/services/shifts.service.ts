import prisma from "../config/prisma";
import { WorkerShift, Department, UserRole } from "@prisma/client";
import { AppError } from "./auth.service";
import { getBusinessDay, parseBusinessDay, formatBusinessDay } from "../utils/businessDay";
import { createAuditLog } from "../utils/audit";

export class ShiftsService {
  /**
   * Get all workers in the manager's department with their shift for a given business day.
   */
  async getShiftsForDay(params: {
    managerDepartment: Department;
    businessDay?: string;
  }) {
    const day = parseBusinessDay(params.businessDay);

    // Find workers in this department
    const workers = await prisma.user.findMany({
      where: {
        role: UserRole.EMPLOYEE,
        employeeProfile: {
          department: params.managerDepartment,
        },
      },
      include: {
        employeeProfile: {
          select: { department: true, isAvailable: true, lastSeenAt: true },
        },
        workerShifts: {
          where: { businessDay: day },
          select: { id: true, shift: true, businessDay: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      businessDay: formatBusinessDay(day),
      workers: workers.map((w) => ({
        id: w.id,
        name: w.name,
        email: w.email,
        department: w.employeeProfile?.department,
        isAvailable: w.employeeProfile?.isAvailable ?? true,
        lastSeenAt: w.employeeProfile?.lastSeenAt,
        shift: w.workerShifts[0]?.shift ?? null,
        shiftId: w.workerShifts[0]?.id ?? null,
      })),
    };
  }

  /**
   * Upsert a shift for a worker on the current (or given) business day.
   */
  async upsertShift(params: {
    workerId: string;
    shift: WorkerShift;
    businessDay?: string;
    createdById: string;
    managerDepartment: Department;
  }) {
    const day = parseBusinessDay(params.businessDay);

    // Verify the worker belongs to the manager's department
    const worker = await prisma.user.findUnique({
      where: { id: params.workerId },
      include: { employeeProfile: { select: { department: true } } },
    });

    if (!worker) {
      throw new AppError("Employé introuvable.", 404);
    }

    if (worker.employeeProfile?.department !== params.managerDepartment) {
      throw new AppError("Cet employé n'appartient pas à votre département.", 403);
    }

    const schedule = await prisma.workerShiftSchedule.upsert({
      where: {
        workerId_businessDay: {
          workerId: params.workerId,
          businessDay: day,
        },
      },
      update: {
        shift: params.shift,
        createdById: params.createdById,
      },
      create: {
        workerId: params.workerId,
        businessDay: day,
        shift: params.shift,
        createdById: params.createdById,
      },
    });

    await createAuditLog({
      actorId: params.createdById,
      action: "UPSERT_SHIFT",
      entity: "WorkerShiftSchedule",
      entityId: schedule.id,
      metadata: {
        workerId: params.workerId,
        workerName: worker.name,
        shift: params.shift,
        businessDay: formatBusinessDay(day),
      },
    });

    return {
      ...schedule,
      workerName: worker.name,
    };
  }
}
