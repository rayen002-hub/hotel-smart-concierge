jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    room: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from "../src/config/prisma";
import {
  CheckinCompletionStatus,
  ReservationStatus,
  RoomStatus,
} from "@prisma/client";
import { RoomService } from "../src/services/room.service";
import { HousekeepingService } from "../src/services/housekeeping.service";
import { getRoomDisplayStatus, isCurrentlyOccupiedBy } from "../src/services/roomOccupancy.service";

const HOTEL_TZ = "Africa/Tunis";
const NOW = new Date("2026-10-29T22:59:59.000Z"); // 23:59:59 in Tunis

const stay = (overrides: Partial<{
  status: ReservationStatus;
  checkinCompletionStatus: CheckinCompletionStatus;
  checkInDate: Date;
  checkOutDate: Date;
}> = {}) => ({
  status: ReservationStatus.CHECKED_IN,
  checkinCompletionStatus: CheckinCompletionStatus.COMPLETED,
  checkInDate: new Date("2026-10-28T00:00:00.000Z"),
  checkOutDate: new Date("2026-10-30T00:00:00.000Z"),
  ...overrides,
});

describe("room occupancy derived from reservations and check-in", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("marks a checked-in guest as occupying the room during the hotel-local stay", () => {
    expect(isCurrentlyOccupiedBy(stay(), NOW, HOTEL_TZ)).toBe(true);
    expect(getRoomDisplayStatus(RoomStatus.AVAILABLE, [stay()], NOW, HOTEL_TZ))
      .toBe(RoomStatus.OCCUPIED);
  });

  it("does not treat future reservations or no-shows as occupants", () => {
    const future = stay({
      status: ReservationStatus.PENDING,
      checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
      checkInDate: new Date("2026-10-30T00:00:00.000Z"),
    });
    const noShow = stay({
      status: ReservationStatus.PENDING,
      checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
      checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
    });

    expect(getRoomDisplayStatus(RoomStatus.OCCUPIED, [future], NOW, HOTEL_TZ))
      .toBe(RoomStatus.AVAILABLE);
    expect(getRoomDisplayStatus(RoomStatus.OCCUPIED, [noShow], NOW, HOTEL_TZ))
      .toBe(RoomStatus.AVAILABLE);
  });

  it("does not count checked-out or cancelled reservations as current occupants", () => {
    const checkedOut = stay({
      status: ReservationStatus.CHECKED_OUT,
      checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
    });
    const cancelled = stay({ status: ReservationStatus.CANCELLED });

    expect(getRoomDisplayStatus(RoomStatus.OCCUPIED, [checkedOut, cancelled], NOW, HOTEL_TZ))
      .toBe(RoomStatus.AVAILABLE);
  });

  it("preserves cleaning and maintenance states", () => {
    expect(getRoomDisplayStatus(RoomStatus.MAINTENANCE, [stay()], NOW, HOTEL_TZ))
      .toBe(RoomStatus.MAINTENANCE);
    expect(getRoomDisplayStatus(RoomStatus.CLEANING, [], NOW, HOTEL_TZ))
      .toBe(RoomStatus.CLEANING);
  });

  it("keeps a room occupied when any overlapping reservation is a genuine current stay", () => {
    const expired = stay({ checkOutDate: new Date("2026-10-28T00:00:00.000Z") });
    expect(getRoomDisplayStatus(RoomStatus.AVAILABLE, [expired, stay()], NOW, HOTEL_TZ))
      .toBe(RoomStatus.OCCUPIED);
  });

  it("uses the inclusive checkout date through local midnight", () => {
    const checkoutToday = stay({
      checkInDate: new Date("2026-10-29T00:00:00.000Z"),
      checkOutDate: new Date("2026-10-29T00:00:00.000Z"),
    });

    expect(getRoomDisplayStatus(RoomStatus.OCCUPIED, [checkoutToday], NOW, HOTEL_TZ))
      .toBe(RoomStatus.OCCUPIED);
    expect(getRoomDisplayStatus(
      RoomStatus.OCCUPIED,
      [checkoutToday],
      new Date("2026-10-29T23:00:00.000Z"), // midnight Oct 30 in Tunis
      HOTEL_TZ
    )).toBe(RoomStatus.AVAILABLE);
  });

  it("returns a derived status alongside the stored status from the rooms API service", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
    jest.setSystemTime(NOW);
    const rooms = [
      { id: "stale", status: RoomStatus.OCCUPIED, reservations: [] },
      { id: "live", status: RoomStatus.AVAILABLE, reservations: [stay()] },
      { id: "maintenance", status: RoomStatus.MAINTENANCE, reservations: [] },
    ];
    (prisma.room.findMany as jest.Mock).mockResolvedValue(rooms);
    (prisma.room.count as jest.Mock).mockResolvedValue(rooms.length);

    const result = await new RoomService().list({ page: 1, limit: 20 });

    expect(result.data.map((room) => [room.id, room.status, room.displayStatus])).toEqual([
      ["stale", RoomStatus.OCCUPIED, RoomStatus.AVAILABLE],
      ["live", RoomStatus.AVAILABLE, RoomStatus.OCCUPIED],
      ["maintenance", RoomStatus.MAINTENANCE, RoomStatus.MAINTENANCE],
    ]);
    expect(result.data[0]).not.toHaveProperty("reservations");
  });

  it("lists only genuinely occupied rooms in the housekeeping occupied-room endpoint", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
    jest.setSystemTime(NOW);
    const room = (id: string, reservations: ReturnType<typeof stay>[]) => ({
      id,
      roomNumber: id,
      floor: 1,
      type: "Standard",
      status: RoomStatus.OCCUPIED,
      reservations,
      housekeepingTasks: [],
    });
    (prisma.room.findMany as jest.Mock).mockResolvedValue([
      room("stale", [stay({
        status: ReservationStatus.PENDING,
        checkinCompletionStatus: CheckinCompletionStatus.NOT_STARTED,
        checkOutDate: new Date("2026-10-28T00:00:00.000Z"),
      })]),
      room("future", [stay({ checkInDate: new Date("2026-10-30T00:00:00.000Z") })]),
      room("active", [stay()]),
    ]);

    const result = await new HousekeepingService().listOccupiedRooms();

    expect(result.map((item) => item.id)).toEqual(["active"]);
    expect(result[0].activeReservation).toBeTruthy();
    expect(result[0].displayStatus).toBe("OCCUPIED");
  });
});
