import {
  CheckinCompletionStatus,
  ReservationStatus,
  RoomStatus,
} from "@prisma/client";
import { compareHotelCalendarDates, getHotelTimeZone } from "../utils/hotelDate";

export interface RoomStayState {
  status: ReservationStatus;
  checkinCompletionStatus?: CheckinCompletionStatus;
  checkInDate: Date;
  checkOutDate: Date;
}

/** A guest occupies a room only after completed check-in and through the
 * existing inclusive, hotel-local checkout date. */
export function isCurrentlyOccupiedBy(
  reservation: RoomStayState,
  now: Date = new Date(),
  timeZone: string = getHotelTimeZone()
): boolean {
  if (
    reservation.status === ReservationStatus.CANCELLED ||
    reservation.status === ReservationStatus.CHECKED_OUT
  ) {
    return false;
  }

  const hasCompletedCheckin =
    reservation.status === ReservationStatus.CHECKED_IN ||
    reservation.checkinCompletionStatus === CheckinCompletionStatus.COMPLETED;
  if (!hasCompletedCheckin) return false;

  return (
    compareHotelCalendarDates(reservation.checkInDate, now, timeZone) <= 0 &&
    compareHotelCalendarDates(reservation.checkOutDate, now, timeZone) >= 0
  );
}

/** Derive occupancy while retaining operational room states such as cleaning
 * and maintenance. NO_SHOW is not persisted; pending reservations without a
 * completed check-in never count as an occupant. */
export function getRoomDisplayStatus(
  roomStatus: RoomStatus,
  reservations: RoomStayState[],
  now: Date = new Date(),
  timeZone: string = getHotelTimeZone()
): RoomStatus {
  if (roomStatus === RoomStatus.CLEANING || roomStatus === RoomStatus.MAINTENANCE) {
    return roomStatus;
  }

  return reservations.some((reservation) => isCurrentlyOccupiedBy(reservation, now, timeZone))
    ? RoomStatus.OCCUPIED
    : RoomStatus.AVAILABLE;
}
