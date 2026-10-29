jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    reservation: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import prisma from "../src/config/prisma";
import { ReservationStatus, RoomStatus } from "@prisma/client";
import { getCheckinEligibility } from "../src/services/reservationLifecycle.service";
import { ReservationStatusService } from "../src/services/reservationStatus.service";
import { generateClientRoomToken } from "../src/services/qrToken.service";
import { startOfNextHotelDate } from "../src/utils/hotelDate";

const TZ = "Africa/Tunis";
const stay = (overrides: Partial<{
  status: ReservationStatus;
  checkInDate: Date;
  checkOutDate: Date;
}> = {}) => ({
  status: ReservationStatus.PENDING,
  checkInDate: new Date("2026-10-30T00:00:00.000Z"),
  checkOutDate: new Date("2026-10-31T00:00:00.000Z"),
  ...overrides,
});

describe("reservation check-in eligibility", () => {
  it("allows check-in throughout the hotel-local arrival date", () => {
    const now = new Date("2026-10-29T22:59:59.000Z"); // 23:59:59 in Tunis
    expect(getCheckinEligibility(stay({
      checkInDate: new Date("2026-10-29T00:00:00.000Z"),
    }), now, TZ).eligible).toBe(true);
  });

  it("rejects arrival dates in the future", () => {
    const now = new Date("2026-10-29T12:00:00.000Z");
    const result = getCheckinEligibility(stay(), now, TZ);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("futur");
  });

  it("allows a pending late arrival through the end of its checkout date", () => {
    const now = new Date("2026-10-30T12:00:00.000Z");
    const result = getCheckinEligibility(stay({
      checkInDate: new Date("2026-10-29T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
    }), now, TZ);
    expect(result.eligible).toBe(true);
  });

  it("rejects an expired reservation after the checkout calendar date ended", () => {
    const now = new Date("2026-10-31T00:00:00.000Z"); // 01:00 in Tunis on Oct 31
    const result = getCheckinEligibility(stay({
      checkInDate: new Date("2026-10-29T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
    }), now, TZ);
    expect(result.eligible).toBe(false);
    expect(result.httpStatus).toBe(410);
  });

  it("calculates the exclusive end of a hotel-local date for client room links", () => {
    expect(startOfNextHotelDate(new Date("2026-10-30T00:00:00.000Z"), TZ).toISOString())
      .toBe("2026-10-30T23:00:00.000Z");
  });

  it("keeps a client room QR token valid through the checkout date", () => {
    const token = generateClientRoomToken(
      "reservation-1",
      "room-1",
      new Date("2026-10-30T00:00:00.000Z"),
      new Date("2026-10-30T22:59:00.000Z"),
      TZ
    );
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    expect(() => generateClientRoomToken(
      "reservation-1",
      "room-1",
      new Date("2026-10-30T00:00:00.000Z"),
      new Date("2026-10-30T23:00:00.000Z"),
      TZ
    )).toThrow("date de checkout est deja passee");
  });

  it.each([
    [ReservationStatus.CANCELLED, "annulée"],
    [ReservationStatus.CHECKED_IN, "déjà enregistrée"],
    [ReservationStatus.CHECKED_OUT, "déjà terminée"],
  ])("rejects check-in for %s reservations", (status, expectedMessage) => {
    const result = getCheckinEligibility(stay({ status }), new Date("2026-10-30T12:00:00.000Z"), TZ);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain(expectedMessage);
  });
});

describe("reservation status job", () => {
  const tx = {
    reservation: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    room: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.reservation.findFirst.mockResolvedValue(null);
    tx.room.updateMany.mockResolvedValue({ count: 1 });
    tx.auditLog.create.mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );
  });

  it("leaves pending reservations unchanged because no no-show status exists", async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([{
      id: "res-1",
      reservationNumber: "DEMO-1",
      status: ReservationStatus.PENDING,
      checkInDate: new Date("2026-10-29T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
      roomId: "room-1",
    }]);

    const result = await new ReservationStatusService().updateExpiredStatuses(
      new Date("2026-10-29T22:59:59.000Z"), TZ
    );

    expect(result).toEqual({ checkedOut: 0, roomsMarkedCleaning: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not depart a checked-in guest until after the checkout calendar date ends", async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([{
      id: "res-2",
      reservationNumber: "DEMO-2",
      status: ReservationStatus.CHECKED_IN,
      checkInDate: new Date("2026-10-28T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
      roomId: "room-2",
    }]);

    const result = await new ReservationStatusService().updateExpiredStatuses(
      new Date("2026-10-30T22:59:59.000Z"), TZ
    );

    expect(result.checkedOut).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not transition an in-house reservation before its checkout date ends", async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([{
      id: "res-in-house",
      reservationNumber: "DEMO-IN-HOUSE",
      status: ReservationStatus.CHECKED_IN,
      checkInDate: new Date("2026-10-28T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-31T00:00:00.000Z"),
      roomId: "room-3",
    }]);

    const result = await new ReservationStatusService().updateExpiredStatuses(
      new Date("2026-10-30T12:00:00.000Z"), TZ
    );

    expect(result.checkedOut).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("checks out only a checked-in stay and marks an occupied room for cleaning", async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([{
      id: "res-2",
      reservationNumber: "DEMO-2",
      status: ReservationStatus.CHECKED_IN,
      checkInDate: new Date("2026-10-28T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
      roomId: "room-2",
    }]);
    tx.reservation.updateMany.mockResolvedValue({ count: 1 });

    const result = await new ReservationStatusService().updateExpiredStatuses(
      new Date("2026-10-30T23:00:00.000Z"), TZ
    );

    expect(result).toEqual({ checkedOut: 1, roomsMarkedCleaning: 1 });
    expect(tx.reservation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "res-2", status: ReservationStatus.CHECKED_IN },
      data: { status: ReservationStatus.CHECKED_OUT },
    }));
    expect(tx.room.updateMany).toHaveBeenCalledWith({
      where: { id: "room-2", status: RoomStatus.OCCUPIED },
      data: { status: RoomStatus.CLEANING },
    });
  });

  it("is idempotent when a checked-in reservation has already checked out", async () => {
    let status: ReservationStatus = ReservationStatus.CHECKED_IN;
    (prisma.reservation.findMany as jest.Mock).mockImplementation(async () =>
      status === ReservationStatus.CHECKED_IN ? [{
        id: "res-3",
        reservationNumber: "DEMO-3",
        status,
        checkInDate: new Date("2026-10-28T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
        roomId: null,
      }] : []
    );
    tx.reservation.updateMany.mockImplementation(async () => {
      status = ReservationStatus.CHECKED_OUT;
      return { count: 1 };
    });

    const service = new ReservationStatusService();
    const first = await service.updateExpiredStatuses(new Date("2026-10-30T23:00:00.000Z"), TZ);
    const second = await service.updateExpiredStatuses(new Date("2026-10-30T23:01:00.000Z"), TZ);

    expect(first.checkedOut).toBe(1);
    expect(second.checkedOut).toBe(0);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("does not change reservations when there are no active check-in candidates", async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    const result = await new ReservationStatusService().updateExpiredStatuses(
      new Date("2026-11-02T12:00:00.000Z"), TZ
    );
    expect(result).toEqual({ checkedOut: 0, roomsMarkedCleaning: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
