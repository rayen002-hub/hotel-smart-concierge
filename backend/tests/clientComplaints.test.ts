import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { generateClientRoomToken } from "../src/services/qrToken.service";

// Mock prisma and AI service
jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    reservation: {
      findUnique: jest.fn(),
    },
    complaint: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../src/services/ai.service", () => {
  return {
    AIService: jest.fn().mockImplementation(() => {
      return {
        analyzeComplaint: jest.fn().mockResolvedValue({
          detectedLanguage: "fr",
          normalizedMessageEn: "The TV does not work",
          staffMessage: "La télé ne fonctionne pas",
          category: "MAINTENANCE",
          categoryConfidence: 0.98,
        }),
      };
    }),
  };
});

describe("Client Complaints (POST /api/public/complaints)", () => {
  const reservationId = "res-id-123";
  const roomId = "room-id-456";
  const checkOutDate = new Date(Date.now() + 86400000); // tomorrow

  // Generate a valid token
  const validToken = generateClientRoomToken(reservationId, roomId, checkOutDate);

  const mockReservation = {
    id: reservationId,
    status: "CHECKED_IN",
    roomId: roomId,
    checkOutDate: checkOutDate,
    guestFirstName: "Jane",
    guestLastName: "Doe",
    room: {
      roomNumber: "204",
      type: "DELUXE",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if X-Client-Room-Token header is missing", async () => {
    const res = await request(app)
      .post("/api/public/complaints")
      .send({ message: "Le climatiseur fuit." });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Token d'acces chambre manquant");
  });

  it("should return 401 if X-Client-Room-Token is invalid", async () => {
    const res = await request(app)
      .post("/api/public/complaints")
      .set("x-client-room-token", "invalid-token-value")
      .send({ message: "Le climatiseur fuit." });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Token d'acces invalide.");
  });

  it("should return 403 if reservation is not CHECKED_IN", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
      ...mockReservation,
      status: "PENDING",
    });

    const res = await request(app)
      .post("/api/public/complaints")
      .set("x-client-room-token", validToken)
      .send({ message: "Le climatiseur fuit." });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("CHECKED_IN requis");
  });

  it("should return 201 and successfully create a complaint with a valid token", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);
    (prisma.complaint.create as jest.Mock).mockResolvedValue({
      id: "complaint-id-999",
      category: "MAINTENANCE",
      status: "PENDING",
      detectedLanguage: "fr",
      staffMessage: "La télé ne fonctionne pas",
      createdAt: new Date(),
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/api/public/complaints")
      .set("x-client-room-token", validToken)
      .send({ message: "La télé ne fonctionne pas" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id", "complaint-id-999");
    expect(res.body.data).toHaveProperty("category", "MAINTENANCE");
    expect(res.body.data).toHaveProperty("status", "PENDING");
  });
});
