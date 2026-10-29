/**
 * Hotel-local calendar helpers. Existing LoomStay business-day logic uses TZ
 * and falls back to Africa/Tunis, so reservation lifecycle checks share that
 * setting instead of comparing UTC timestamps directly.
 */
export const DEFAULT_HOTEL_TIME_ZONE = "Africa/Tunis";

export function getHotelTimeZone(): string {
  return process.env.TZ || DEFAULT_HOTEL_TIME_ZONE;
}

export function hotelCalendarDate(
  value: Date,
  timeZone: string = getHotelTimeZone()
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");

  if (!year || !month || !day) {
    throw new Error(`Could not determine hotel-local date for timezone ${timeZone}.`);
  }

  return `${year}-${month}-${day}`;
}

export function compareHotelCalendarDates(
  left: Date,
  right: Date,
  timeZone: string = getHotelTimeZone()
): number {
  const a = hotelCalendarDate(left, timeZone);
  const b = hotelCalendarDate(right, timeZone);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Return the exclusive UTC instant at which the supplied hotel-local date ends. */
export function startOfNextHotelDate(
  value: Date,
  timeZone: string = getHotelTimeZone()
): Date {
  const localDate = hotelCalendarDate(value, timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const target = {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };

  // Convert the next local midnight to UTC by correcting the initial UTC guess
  // with the timezone offset returned by Intl. Iterate to handle offset changes.
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, 0, 0, 0);
  let guess = targetAsUtc;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 4; i += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const displayedAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    const correction = targetAsUtc - displayedAsUtc;
    if (correction === 0) break;
    guess += correction;
  }

  return new Date(guess);
}
