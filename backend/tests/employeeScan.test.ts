import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import { generateWorkerRoomQr } from "../src/services/qrToken.service";

// Mock Prisma
jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    complaint: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
    },
    interventionLog: {
      create: jest.fn(),
    },
  },
}));

describe("Employee Room Scan (POST /api/mobile/tasks/:id/scan-entry)", () => {
  const employeeId = "emp-123";
  const complaintId = "compl-999";
  const roomId = "room-abc";

  // Create a valid employee JWT
  const employeeToken = jwt.sign(
    { userId: employeeId, role: "EMPLOYEE" },
    env.JWT_SECRET
  );

  // Generate a valid worker QR token
  const validQrToken = generateWorkerRoomQr(roomId, 1);

  const mockComplaint = {
    id: complaintId,
    reservationId: "res-123",
    roomId: roomId,
    originalMessage: "Need clean towels",
    category: "HOUSEKEEPING",
    status: "ASSIGNED",
    assignedToId: employeeId,
  };

  const mockRoom = {
    id: roomId,
    roomNumber: "105",
    floor: 1,
    type: "STANDARD",
    status: "AVAILABLE",
    workerQrVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if workerRoomQrToken is invalid", async () => {
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(mockComplaint);

    const res = await request(app)
      .post(`/api/mobile/tasks/${complaintId}/scan-entry`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ workerRoomQrToken: "invalid-qr-token" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("QR code invalide.");
  });

  it("should return 200 and create log if workerRoomQrToken is valid", async () => {
    (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(mockComplaint);
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
    (prisma.interventionLog.create as jest.Mock).mockResolvedValue({
      id: "log-123",
      complaintId,
      employeeId,
      roomId,
      entryTime: new Date(),
    });
    (prisma.complaint.update as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post(`/api/mobile/tasks/${complaintId}/scan-entry`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ workerRoomQrToken: validQrToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id", "log-123");
  });
});
