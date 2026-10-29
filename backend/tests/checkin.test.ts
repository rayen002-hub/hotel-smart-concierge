import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import prisma from "../src/config/prisma";
import { env } from "../src/config/env";
import { generateCheckinToken } from "../src/services/checkinToken.service";

// Mock Prisma
jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    reservation: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("Check-in Access (POST /api/public/checkin/lookup)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it("rejects a direct QR check-in submit after the checkout calendar date ended", async () => {
    const tx = {
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "expired-reservation",
          reservationNumber: "RES-OLD",
          guestFirstName: "John",
          guestLastName: "Smith",
          checkInDate: new Date("2026-10-27T00:00:00.000Z"),
          checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
          status: "PENDING",
          adultsCount: 1,
          childrenCount: 0,
          totalGuests: 1,
          checkinCompletionStatus: "NOT_STARTED",
          roomId: null,
          room: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      guestForm: { upsert: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(1) },
      room: { update: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );

    const res = await request(app)
      .post("/api/public/checkin/submit")
      .set("x-checkin-token", validToken)
      .send({
        reservationNumber: "RES-OLD",
        travelerIndex: 1,
        travelerType: "ADULT",
        fullName: "John Smith",
        nationality: "French",
      });

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("période");
    expect(tx.guestForm.upsert).not.toHaveBeenCalled();
    expect(tx.room.update).not.toHaveBeenCalled();
  });

  it("applies the same expired-date check to the authenticated reception-assisted route", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({ reservationNumber: "RES-OLD" });
    const tx = {
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "expired-reservation",
          reservationNumber: "RES-OLD",
          checkInDate: new Date("2026-10-27T00:00:00.000Z"),
          checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
          status: "PENDING",
          totalGuests: 1,
          roomId: null,
          room: null,
        }),
      },
      guestForm: { upsert: jest.fn(), count: jest.fn() },
      room: { update: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );
    const staffToken = jwt.sign(
      { userId: "reception-demo", role: "RECEPTIONIST" },
      env.JWT_SECRET
    );

    const res = await request(app)
      .post("/api/reservations/expired-reservation/check-in")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        travelerIndex: 1,
        travelerType: "ADULT",
        fullName: "John Smith",
        nationality: "French",
      });

    expect(res.status).toBe(410);
    expect(res.body.error).toContain("période");
    expect(tx.guestForm.upsert).not.toHaveBeenCalled();
    expect(tx.room.update).not.toHaveBeenCalled();
  });

  it("checks in an eligible arrival and updates room occupancy with the traveler forms", async () => {
    jest.useFakeTimers({
      doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"],
    });
    jest.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

    const tx = {
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "reservation-today",
          reservationNumber: "RES-TODAY",
          guestFirstName: "John",
          guestLastName: "Smith",
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + 86400000),
          status: "PENDING",
          totalGuests: 1,
          roomId: "room-1",
          room: { roomNumber: "101", type: "Standard" },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      guestForm: { upsert: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(1) },
      room: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );

    const res = await request(app)
      .post("/api/public/checkin/submit")
      .set("x-checkin-token", validToken)
      .send({
        reservationNumber: "RES-TODAY",
        travelerIndex: 1,
        travelerType: "ADULT",
        fullName: "John Smith",
        nationality: "French",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CHECKED_IN");
    expect(tx.reservation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "CHECKED_IN", checkinCompletionStatus: "COMPLETED" }),
    }));
    expect(tx.room.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "room-1" },
      data: { status: "OCCUPIED" },
    }));
  });

  it("does not complete a second concurrent check-in after the status compare-and-set loses", async () => {
    jest.useFakeTimers({
      doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"],
    });
    jest.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

    const tx = {
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "reservation-race",
          reservationNumber: "RES-RACE",
          guestFirstName: "John",
          guestLastName: "Smith",
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + 86400000),
          status: "PENDING",
          totalGuests: 1,
          roomId: "room-1",
          room: { roomNumber: "101", type: "Standard" },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      guestForm: { upsert: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(1) },
      room: { update: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );

    const res = await request(app)
      .post("/api/public/checkin/submit")
      .set("x-checkin-token", validToken)
      .send({
        reservationNumber: "RES-RACE",
        travelerIndex: 1,
        travelerType: "ADULT",
        fullName: "John Smith",
        nationality: "French",
      });

    expect(res.status).toBe(409);
    expect(tx.room.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
