import { Department, UserRole, WorkerShift } from "@prisma/client";
import prisma from "../src/config/prisma";
import { ShiftsService } from "../src/services/shifts.service";

jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    workerShiftSchedule: { upsert: jest.fn() },
  },
}));

jest.mock("../src/utils/audit", () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));

describe("shared worker shift scheduling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "maintenance-worker",
      name: "Maintenance Worker",
      role: UserRole.EMPLOYEE,
      employeeProfile: { department: Department.MAINTENANCE },
    });
    (prisma.workerShiftSchedule.upsert as jest.Mock).mockResolvedValue({
      id: "shift-1",
      workerId: "maintenance-worker",
      shift: WorkerShift.NIGHT,
      businessDay: new Date("2026-10-30T00:00:00.000Z"),
    });
  });

  it("allows the maintenance manager workflow to save the shared NIGHT shift", async () => {
    const result = await new ShiftsService().upsertShift({
      workerId: "maintenance-worker",
      shift: WorkerShift.NIGHT,
      businessDay: "2026-10-30",
      createdById: "maintenance-manager",
      managerDepartment: Department.MAINTENANCE,
    });

    expect(prisma.workerShiftSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        workerId: "maintenance-worker",
        businessDay: new Date("2026-10-30T00:00:00.000Z"),
        shift: WorkerShift.NIGHT,
      }),
    }));
    expect(result.shift).toBe(WorkerShift.NIGHT);
  });
});
