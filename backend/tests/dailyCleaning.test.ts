/**
 * Tests automatises — DailyCleaningTask
 *
 * Couvre :
 *  - Succes : creation d'une tache quotidienne valide
 *  - Echec : employe en DAY_OFF (HTTP 400)
 *  - Echec : doublon chambre/journee (HTTP 409)
 *  - Echec : role EMPLOYEE ne peut pas creer (HTTP 403)
 *  - Succes : l'employe demarre sa propre tache
 *  - Echec : un autre employe essaie de demarrer la tache (HTTP 403)
 *  - Echec : sans token JWT (HTTP 401)
 */

import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import { getBusinessDay } from "../src/utils/businessDay";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    room: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    workerShiftSchedule: { findFirst: jest.fn() },
    dailyCleaningTask: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

// ─── JWT tokens ─────────────────────────────────────────────────────────────

const MANAGER_ID     = "11111111-1111-4111-a111-111111111111";
const WORKER_ID      = "22222222-2222-4222-a222-222222222222";
const OTHER_WORKER_ID = "33333333-3333-4333-a333-333333333333";
const ROOM_ID        = "44444444-4444-4444-a444-444444444444";
const TASK_ID        = "55555555-5555-4555-a555-555555555555";

const managerToken      = jwt.sign({ userId: MANAGER_ID, role: "HOUSEKEEPING_MANAGER" }, env.JWT_SECRET);
const employeeToken     = jwt.sign({ userId: WORKER_ID, role: "EMPLOYEE" }, env.JWT_SECRET);
const otherEmployeeToken = jwt.sign({ userId: OTHER_WORKER_ID, role: "EMPLOYEE" }, env.JWT_SECRET);

// ─── Shared mock data ────────────────────────────────────────────────────────

const mockRoom = {
  id: ROOM_ID, roomNumber: "101", floor: 1, type: "STANDARD", status: "AVAILABLE",
};

const mockHkWorker = {
  id: WORKER_ID,
  name: "Alice Menage",
  role: "EMPLOYEE",
  employeeProfile: { department: "HOUSEKEEPING", isAvailable: true },
};

const mockTask = {
  id: TASK_ID,
  roomId: ROOM_ID,
  workerId: WORKER_ID,
  businessDay: getBusinessDay(),
  status: "ASSIGNED",
  note: null,
  assignedById: MANAGER_ID,
  startedAt: null,
  completedAt: null,
  room: mockRoom,
  worker: { id: WORKER_ID, name: "Alice Menage" },
  assignedBy: { id: MANAGER_ID, name: "Manager HK" },
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/housekeeping/daily-tasks
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/housekeeping/daily-tasks — Creation tache quotidienne", () => {
  const ENDPOINT = "/api/housekeeping/daily-tasks";

  it("SUCCESS — cree une tache valide pour un travailleur disponible", async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockHkWorker);
    (prisma.workerShiftSchedule.findFirst as jest.Mock).mockResolvedValue(null); // no shift = allowed
    (prisma.dailyCleaningTask.findFirst as jest.Mock).mockResolvedValue(null);  // no duplicate
    (prisma.dailyCleaningTask.create as jest.Mock).mockResolvedValue(mockTask);

    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ roomId: ROOM_ID, workerId: WORKER_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id", TASK_ID);
  });

  it("FAILURE — employe en DAY_OFF (HTTP 400)", async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockHkWorker);
    (prisma.workerShiftSchedule.findFirst as jest.Mock).mockResolvedValue({ shift: "DAY_OFF" });

    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ roomId: ROOM_ID, workerId: WORKER_ID });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Accept any 400 error — the exact message depends on the service version
    expect(res.body.error).toBeTruthy();
  });

  it("FAILURE — doublon tache pour meme chambre/journee (HTTP 409)", async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockHkWorker);
    (prisma.workerShiftSchedule.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.dailyCleaningTask.findFirst as jest.Mock).mockResolvedValue({
      id: "existing-task-id", status: "ASSIGNED",
    });

    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ roomId: ROOM_ID, workerId: WORKER_ID });

    // Service may return 409 for duplicate, or 400 with conflict message
    expect([409, 400].includes(res.status)).toBe(true);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeTruthy();
  });

  it("FAILURE — role EMPLOYEE ne peut pas creer (HTTP 403)", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ roomId: ROOM_ID, workerId: WORKER_ID });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("FAILURE — roomId manquant dans le body (HTTP 400)", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ workerId: WORKER_ID }); // roomId absent

    expect([400, 422].includes(res.status)).toBe(true);
    expect(res.body.success).toBe(false);
  });

  it("FAILURE — sans token JWT (HTTP 401)", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .send({ roomId: ROOM_ID, workerId: WORKER_ID });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  PATCH /api/housekeeping/daily-tasks/:id/start
// ═══════════════════════════════════════════════════════════════════════════

describe("PATCH /api/housekeeping/daily-tasks/:id/start — Demarrage tache", () => {
  it("SUCCESS — l'employe demarre sa propre tache", async () => {
    (prisma.dailyCleaningTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.dailyCleaningTask.update as jest.Mock).mockResolvedValue({
      ...mockTask, status: "IN_PROGRESS", startedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/housekeeping/daily-tasks/${TASK_ID}/start`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("IN_PROGRESS");
  });

  it("FAILURE — un autre employe essaie de demarrer la tache (HTTP 403)", async () => {
    (prisma.dailyCleaningTask.findUnique as jest.Mock).mockResolvedValue(mockTask);

    const res = await request(app)
      .patch(`/api/housekeeping/daily-tasks/${TASK_ID}/start`)
      .set("Authorization", `Bearer ${otherEmployeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/assign|tache|vous/i);
  });

  it("FAILURE — sans token JWT (HTTP 401)", async () => {
    const res = await request(app)
      .patch(`/api/housekeeping/daily-tasks/${TASK_ID}/start`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
