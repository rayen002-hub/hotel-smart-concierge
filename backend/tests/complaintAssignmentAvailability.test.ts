import { ComplaintCategory, ComplaintStatus, Department, WorkerShift } from "@prisma/client";
import prisma from "../src/config/prisma";
import { assignStaffComplaint } from "../src/controllers/staffComplaint.controller";
import { AuthRequest } from "../src/middlewares/auth.middleware";
import { AppError } from "../src/services/auth.service";
import { ComplaintService } from "../src/services/complaint.service";

jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    complaint: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    workerShiftSchedule: { findUnique: jest.fn() },
  },
}));

jest.mock("../src/utils/audit", () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../src/services/ai.service", () => ({ AIService: jest.fn().mockImplementation(() => ({})) }));

describe("complaint assignment shift validation", () => {
  const service = new ComplaintService();
  const occurrence = new Date("2026-10-30T16:00:00.000Z"); // 17:00 in Africa/Tunis

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue({
      id: "complaint-1",
      createdAt: occurrence,
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.PENDING,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "worker-1",
      role: "EMPLOYEE",
      isActive: true,
      employeeProfile: { department: Department.MAINTENANCE, isAvailable: true },
    });
    (prisma.complaint.update as jest.Mock).mockResolvedValue({ id: "complaint-1" });
  });

  it("rejects an out-of-shift assignment before persisting it", async () => {
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.MORNING });

    await expect(service.assignComplaint("complaint-1", "worker-1", "manager-1"))
      .rejects.toThrow("Hors horaires");
    expect(prisma.complaint.update).not.toHaveBeenCalled();
  });

  it("accepts a worker whose scheduled shift covers the complaint occurrence", async () => {
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.EVENING });

    await service.assignComplaint("complaint-1", "worker-1", "manager-1");

    expect(prisma.workerShiftSchedule.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        workerId_businessDay: {
          workerId: "worker-1",
          businessDay: new Date("2026-10-30T00:00:00.000Z"),
        },
      },
    }));
    expect(prisma.complaint.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assignedToId: "worker-1", status: ComplaintStatus.ASSIGNED }),
    }));
  });

  it("accepts a maintenance night shift at 23:30 on its scheduled start date", async () => {
    const at2330 = new Date("2026-10-30T22:30:00.000Z"); // 23:30 Tunisia time
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue({
      id: "complaint-1",
      createdAt: at2330,
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.PENDING,
    });
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.NIGHT });

    await service.assignComplaint("complaint-1", "worker-1", "manager-1");

    expect(prisma.workerShiftSchedule.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { workerId_businessDay: { workerId: "worker-1", businessDay: new Date("2026-10-30T00:00:00.000Z") } },
    }));
    expect(prisma.complaint.update).toHaveBeenCalled();
  });

  it("matches a 02:00 maintenance complaint to the previous date's night shift", async () => {
    const at0200 = new Date("2026-10-31T01:00:00.000Z"); // 02:00 Tunisia time
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue({
      id: "complaint-1",
      createdAt: at0200,
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.PENDING,
    });
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.NIGHT });

    await service.assignComplaint("complaint-1", "worker-1", "manager-1");

    expect(prisma.workerShiftSchedule.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { workerId_businessDay: { workerId: "worker-1", businessDay: new Date("2026-10-30T00:00:00.000Z") } },
    }));
    expect(prisma.complaint.update).toHaveBeenCalled();
  });

  it("preserves housekeeping night-shift assignment eligibility", async () => {
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue({
      id: "complaint-1",
      createdAt: new Date("2026-10-30T22:30:00.000Z"), // 23:30 Tunisia time
      category: ComplaintCategory.HOUSEKEEPING,
      status: ComplaintStatus.PENDING,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "worker-1",
      role: "EMPLOYEE",
      isActive: true,
      employeeProfile: { department: Department.HOUSEKEEPING, isAvailable: true },
    });
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.NIGHT });

    await service.assignComplaint("complaint-1", "worker-1", "manager-1");

    expect(prisma.complaint.update).toHaveBeenCalled();
  });

  it("rejects the assignment if the occurrence timestamp is unavailable", async () => {
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue({
      id: "complaint-1",
      createdAt: null,
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.PENDING,
    });

    await expect(service.assignComplaint("complaint-1", "worker-1", "manager-1"))
      .rejects.toThrow("date et l'heure de la réclamation sont indisponibles");
    expect(prisma.workerShiftSchedule.findUnique).not.toHaveBeenCalled();
    expect(prisma.complaint.update).not.toHaveBeenCalled();
  });

  it("rejects an ineligible assignment submitted through the endpoint controller", async () => {
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.MORNING });
    const next = jest.fn();
    const req = {
      params: { id: "complaint-1" },
      body: { employeeId: "worker-1" },
      userId: "manager-1",
      userRole: "MAINTENANCE_MANAGER",
    } as unknown as AuthRequest;

    await assignStaffComplaint(req, {} as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("Hors horaires");
    expect(prisma.complaint.update).not.toHaveBeenCalled();
  });
});
