/**
 * Business day utility for LoomStay.
 *
 * The "business day" resets at 06:00 local server time.
 * A request at 03:00 on June 26 belongs to the June 25 business day.
 * businessDay is stored as midnight UTC of the calendar day.
 */

const RESET_HOUR = 6; // 06:00

/**
 * Returns the business day for a given date (defaults to now).
 * Result is midnight UTC of the corresponding calendar day.
 */
export function getBusinessDay(date: Date = new Date()): Date {
  // Use local time for hour comparison
  const local = new Date(date.toLocaleString("en-US", { timeZone: process.env.TZ || "Africa/Tunis" }));
  const hour = local.getHours();

  // If before 06:00, the business day is yesterday
  const calendarDate = new Date(date);
  if (hour < RESET_HOUR) {
    calendarDate.setDate(calendarDate.getDate() - 1);
  }

  // Return midnight UTC for that calendar date (YYYY-MM-DD 00:00:00 UTC)
  return new Date(
    Date.UTC(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      calendarDate.getDate(),
      0,
      0,
      0,
      0
    )
  );
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
