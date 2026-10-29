import { ReservationStatus } from "@prisma/client";
import { AppError } from "./auth.service";
import { compareHotelCalendarDates, getHotelTimeZone } from "../utils/hotelDate";

export interface CheckinReservationState {
  status: ReservationStatus;
  checkInDate: Date;
  checkOutDate: Date;
}

export interface CheckinEligibility {
  eligible: boolean;
  reason: string | null;
  httpStatus: number | null;
}

/**
 * Shared eligibility rule used by public QR check-in lookup and submission.
 * An arrival is eligible for the full hotel-local calendar day. Late arrival
 * remains possible through the checkout calendar day while the reservation is
 * still PENDING.
 */
export function getCheckinEligibility(
  reservation: CheckinReservationState,
  now: Date = new Date(),
  timeZone: string = getHotelTimeZone()
): CheckinEligibility {
  switch (reservation.status) {
    case ReservationStatus.CANCELLED:
      return { eligible: false, reason: "Cette réservation a été annulée.", httpStatus: 409 };
    case ReservationStatus.CHECKED_IN:
      return { eligible: false, reason: "Cette réservation est déjà enregistrée.", httpStatus: 409 };
    case ReservationStatus.CHECKED_OUT:
      return { eligible: false, reason: "Cette réservation est déjà terminée.", httpStatus: 409 };
    case ReservationStatus.PENDING:
      break;
    default:
      return { eligible: false, reason: "Le statut de cette réservation ne permet pas le check-in.", httpStatus: 409 };
  }

  const arrivalComparison = compareHotelCalendarDates(reservation.checkInDate, now, timeZone);
  if (arrivalComparison > 0) {
    return {
      eligible: false,
      reason: "Le check-in n'est pas encore ouvert : la date d'arrivée est dans le futur.",
      httpStatus: 409,
    };
  }

  const checkoutComparison = compareHotelCalendarDates(reservation.checkOutDate, now, timeZone);
  if (checkoutComparison < 0) {
    return {
      eligible: false,
      reason: "La période de cette réservation est terminée.",
      httpStatus: 410,
    };
  }

  return { eligible: true, reason: null, httpStatus: null };
}

export function assertCheckinEligible(
  reservation: CheckinReservationState,
  now: Date = new Date(),
  timeZone: string = getHotelTimeZone()
): void {
  const eligibility = getCheckinEligibility(reservation, now, timeZone);
  if (!eligibility.eligible) {
    throw new AppError(eligibility.reason || "Cette réservation ne permet pas le check-in.", eligibility.httpStatus || 409);
  }
}
