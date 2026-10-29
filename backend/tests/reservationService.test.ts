jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    reservation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from "../src/config/prisma";
import { CheckinCompletionStatus, ReservationStatus } from "@prisma/client";
import { ReservationService } from "../src/services/reservation.service";

describe("reservation creation and lifecycle-owned status updates", () => {
  const tx = {
    reservation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    room: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );
    tx.reservation.findUnique.mockResolvedValue(null);
    tx.reservation.findMany.mockResolvedValue([]);
    tx.room.findUnique.mockResolvedValue({ id: "room-1" });
    tx.auditLog.create.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("derives dashboard reservation statuses from check-in records and hotel-local dates", async () => {
    jest.useFakeTimers({
      doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"],
    });
    jest.setSystemTime(new Date("2026-10-29T22:59:59.000Z")); // 23:59:59 in Tunis

    const reservations = [
      {
        id: "no-show",
        status: ReservationStatus.PENDING,
        checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
        checkInDate: new Date("2026-10-28T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
      },
      {
        id: "arrived",
        status: ReservationStatus.CHECKED_IN,
        checkinCompletionStatus: CheckinCompletionStatus.COMPLETED,
        checkInDate: new Date("2026-10-29T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
      },
      {
        id: "departed",
        status: ReservationStatus.CHECKED_IN,
        checkinCompletionStatus: CheckinCompletionStatus.COMPLETED,
        checkInDate: new Date("2026-10-27T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-29T00:00:00.000Z"),
      },
      {
        id: "upcoming",
        status: ReservationStatus.PENDING,
        checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
        checkInDate: new Date("2026-10-30T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-31T00:00:00.000Z"),
      },
      {
        id: "already-checked-out",
        status: ReservationStatus.CHECKED_OUT,
        checkinCompletionStatus: CheckinCompletionStatus.COMPLETED,
        checkInDate: new Date("2026-10-28T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
      },
      {
        id: "cancelled",
        status: ReservationStatus.CANCELLED,
        checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
        checkInDate: new Date("2026-10-27T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
      },
    ];
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue(reservations);
    (prisma.reservation.count as jest.Mock).mockResolvedValue(reservations.length);

    const result = await new ReservationService().list({ page: 1, limit: 20 });

    expect(result.data.map((reservation) => [reservation.id, reservation.displayStatus])).toEqual([
      ["no-show", "NO_SHOW"],
      ["arrived", ReservationStatus.CHECKED_IN],
      ["departed", ReservationStatus.CHECKED_IN],
      ["upcoming", ReservationStatus.PENDING],
      ["already-checked-out", ReservationStatus.CHECKED_OUT],
      ["cancelled", ReservationStatus.CANCELLED],
    ]);

    jest.setSystemTime(new Date("2026-10-29T23:00:00.000Z")); // local midnight in Tunis
    const afterLocalMidnight = await new ReservationService().list({ page: 1, limit: 20 });
    expect(afterLocalMidnight.data[0].displayStatus).toBe("NO_SHOW");
    expect(afterLocalMidnight.data[2].displayStatus).toBe(ReservationStatus.CHECKED_OUT);
    expect(afterLocalMidnight.data[4].displayStatus).toBe(ReservationStatus.CHECKED_OUT);
  });

  const createInput = {
    reservationNumber: "DEMO-20261030-01",
    guestFirstName: "Maya",
    guestLastName: "Ben Salem",
    guestEmail: "maya.demo@example.com",
    guestPhone: "+21600000000",
    nationality: "Tunisian",
    checkInDate: "2026-10-30T00:00:00.000Z",
    checkOutDate: "2026-11-01T00:00:00.000Z",
    roomId: "room-1",
    adultsCount: 2,
    childrenCount: 1,
  };

  it("rejects room-date overlap with another pending or checked-in reservation", async () => {
    tx.reservation.findMany.mockResolvedValue([{
      checkInDate: new Date("2026-10-30T00:00:00.000Z"),
      checkOutDate: new Date("2026-11-01T00:00:00.000Z"),
    }]);

    await expect(new ReservationService().create(createInput, "reception-1"))
      .rejects.toMatchObject({ statusCode: 409 });

    expect(tx.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        roomId: "room-1",
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN] },
      }),
    }));
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it("uses exclusive checkout overlap bounds and stores guest counts consistently", async () => {
    // Checkout on Oct 30 and the new check-in on Oct 30 are adjacent stays.
    tx.reservation.findMany.mockResolvedValue([{
      checkInDate: new Date("2026-10-28T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
    }]);
    tx.reservation.create.mockResolvedValue({
      id: "new-reservation",
      reservationNumber: createInput.reservationNumber,
      adultsCount: 2,
      childrenCount: 1,
      totalGuests: 3,
      status: ReservationStatus.PENDING,
    });

    const result = await new ReservationService().create(createInput, "reception-1");

    expect(tx.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        roomId: "room-1",
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN] },
      }),
    }));
    expect(tx.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ adultsCount: 2, childrenCount: 1, totalGuests: 3 }),
    }));
    expect(result.totalGuests).toBe(3);
  });

  it("does not allow receptionist edits to set checked-in or checked-out statuses", async () => {
    tx.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      status: ReservationStatus.PENDING,
      checkInDate: new Date("2026-10-30T00:00:00.000Z"),
      checkOutDate: new Date("2026-11-01T00:00:00.000Z"),
      roomId: null,
    });

    for (const status of [
      ReservationStatus.CHECKED_IN,
      ReservationStatus.CHECKED_OUT,
    ]) {
      await expect(new ReservationService().update("res-1", { status }, "reception-1"))
        .rejects.toMatchObject({ statusCode: 409 });
    }
    expect(tx.reservation.update).not.toHaveBeenCalled();
  });
});
