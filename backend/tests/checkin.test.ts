import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { generateCheckinToken } from "../src/services/checkinToken.service";

// Mock Prisma
jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    reservation: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Check-in Access (POST /api/public/checkin/lookup)", () => {
  const validToken = generateCheckinToken();

  const mockReservation = {
    id: "res-checkin-123",
    guestFirstName: "John",
    guestLastName: "Smith",
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000),
    status: "PENDING",
    adultsCount: 1,
    childrenCount: 0,
    totalGuests: 1,
    checkinCompletionStatus: "NOT_STARTED",
    guestForms: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if X-Checkin-Token is missing", async () => {
    const res = await request(app)
      .post("/api/public/checkin/lookup")
      .send({ reservationNumber: "RES-123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Token de check-in manquant");
  });

  it("should return 401 if X-Checkin-Token is invalid", async () => {
    const res = await request(app)
      .post("/api/public/checkin/lookup")
      .set("x-checkin-token", "invalid-token-value")
      .send({ reservationNumber: "RES-123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Token de check-in invalide.");
  });

  it("should return 200 and reservation info with valid token", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);

    const res = await request(app)
      .post("/api/public/checkin/lookup")
      .set("x-checkin-token", validToken)
      .send({ reservationNumber: "RES-123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("reservationId", "res-checkin-123");
    expect(res.body.data).toHaveProperty("totalGuests", 1);
  });

  it("should return 404 when reservation is not found", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/public/checkin/lookup")
      .set("x-checkin-token", validToken)
      .send({ reservationNumber: "RES-NONEXISTENT" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Reservation introuvable.");
  });
});
