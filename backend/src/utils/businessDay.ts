/**
 * Business day utility for LoomStay.
 *
 * The "business day" resets at 06:00 local server time.
 * A request at 03:00 on June 26 belongs to the June 25 business day.
 * businessDay is stored as midnight UTC of the calendar day.
 */
import { getHotelTimeZone, hotelCalendarDate } from "./hotelDate";

const RESET_HOUR = 6; // 06:00

/**
 * Returns the business day for a given date (defaults to now).
 * Result is midnight UTC of the corresponding calendar day.
 */
export function getBusinessDay(date: Date = new Date()): Date {
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: getHotelTimeZone(),
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(timeParts.find((part) => part.type === "hour")?.value);
  const [year, month, day] = hotelCalendarDate(date).split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  // Before the 06:00 Tunisia boundary, use the previous local calendar date.
  if (hour < RESET_HOUR) calendarDate.setUTCDate(calendarDate.getUTCDate() - 1);
  return calendarDate;
}

/**
 * Parse a businessDay from an ISO date string (YYYY-MM-DD).
 * Returns midnight UTC for that date, or today's business day if not provided.
 */
export function parseBusinessDay(dateStr?: string): Date {
  if (!dateStr) return getBusinessDay();

  const parts = dateStr.split("-");
  if (parts.length !== 3) return getBusinessDay();

  return new Date(
    Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0)
  );
}

/**
 * Format a businessDay as YYYY-MM-DD for display/API.
 */
export function formatBusinessDay(date: Date): string {
  return date.toISOString().split("T")[0];
}
