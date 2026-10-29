import { Department, HousekeepingTaskStatus, UserRole, WorkerShift } from "@prisma/client";
import prisma from "../src/config/prisma";
import { HousekeepingService } from "../src/services/housekeeping.service";

jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    room: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    workerShiftSchedule: { findUnique: jest.fn() },
    housekeepingTask: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("../src/utils/audit", () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));

describe("explicit housekeeping task assignment", () => {
  const room = { id: "room-1" };
  const worker = {
    id: "worker-1",
    name: "Housekeeping Worker",
    role: UserRole.EMPLOYEE,
    isActive: true,
    employeeProfile: { department: Department.HOUSEKEEPING, isAvailable: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(room);
    (prisma.housekeepingTask.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(worker);
    (prisma.housekeepingTask.create as jest.Mock).mockResolvedValue({ id: "task-1" });
  });

  it("rejects a housekeeping worker whose shift does not cover task creation time", async () => {
    const occurrenceAt = new Date("2026-10-30T16:00:00.000Z"); // 17:00 Tunisia
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.MORNING });
    const service = new HousekeepingService(() => occurrenceAt);

    await expect(service.createTask({
      roomId: room.id,
      assignedToId: worker.id,
      assignedById: "manager-1",
    })).rejects.toThrow("Hors horaires");

    expect(prisma.housekeepingTask.create).not.toHaveBeenCalled();
  });

  it("creates an explicitly assigned housekeeping task for an eligible worker", async () => {
    const occurrenceAt = new Date("2026-10-30T16:00:00.000Z"); // 17:00 Tunisia
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.EVENING });
    const service = new HousekeepingService(() => occurrenceAt);

    await service.createTask({ roomId: room.id, assignedToId: worker.id, assignedById: "manager-1" });

    expect(prisma.housekeepingTask.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        assignedToId: worker.id,
        status: HousekeepingTaskStatus.ASSIGNED,
        createdAt: occurrenceAt,
      }),
    }));
  });

  it("uses the previous day's NIGHT schedule for a task at 02:00 Tunisia time", async () => {
    const occurrenceAt = new Date("2026-10-31T01:00:00.000Z"); // 02:00 Tunisia
    (prisma.workerShiftSchedule.findUnique as jest.Mock).mockResolvedValue({ shift: WorkerShift.NIGHT });
    const service = new HousekeepingService(() => occurrenceAt);

    await service.createTask({ roomId: room.id, assignedToId: worker.id, assignedById: "manager-1" });

    expect(prisma.workerShiftSchedule.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { workerId_businessDay: { workerId: worker.id, businessDay: new Date("2026-10-30T00:00:00.000Z") } },
    }));
    expect(prisma.housekeepingTask.create).toHaveBeenCalled();
  });

  it("preserves the existing per-room active-task conflict rule", async () => {
    (prisma.housekeepingTask.findFirst as jest.Mock).mockResolvedValue({ id: "active-task" });
    const service = new HousekeepingService(() => new Date("2026-10-30T16:00:00.000Z"));

    await expect(service.createTask({
      roomId: room.id,
      assignedToId: worker.id,
      assignedById: "manager-1",
    })).rejects.toThrow("Une tâche de ménage est déjà active pour cette chambre");
    expect(prisma.housekeepingTask.create).not.toHaveBeenCalled();
  });
});
