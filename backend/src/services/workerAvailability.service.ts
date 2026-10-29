import { WorkerShift } from "@prisma/client";
import prisma from "../config/prisma";
import { getHotelTimeZone, hotelCalendarDate } from "../utils/hotelDate";

export type WorkerAvailabilityStatus =
  | "AVAILABLE"
  | "DAY_OFF"
  | "OUTSIDE_SHIFT"
  | "NO_SCHEDULE"
  | "UNAVAILABLE"
  | "INACTIVE";

export interface WorkerAvailability {
  status: WorkerAvailabilityStatus;
  label: string;
  eligible: boolean;
  at: string;
}

const STATUS_LABELS: Record<WorkerAvailabilityStatus, string> = {
  AVAILABLE: "Disponible",
  DAY_OFF: "En repos",
  OUTSIDE_SHIFT: "Hors horaires",
  NO_SCHEDULE: "Aucun planning valide",
  UNAVAILABLE: "Indisponible",
  INACTIVE: "Indisponible",
};

/**
 * A schedule is keyed by the local calendar day on which its shift starts.
 * The NIGHT shift runs 23:00–07:00, so instants before 07:00 belong to the
 * previous day's schedule, including the 06:00–07:00 period after the hotel
 * business-day boundary.
 */
export function getShiftScheduleDay(
  at: Date,
  timeZone: string = getHotelTimeZone()
): Date {
  if (!Number.isFinite(at.getTime())) throw new Error("Invalid availability date.");

  const date = hotelCalendarDate(at, timeZone);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(timeParts.find((part) => part.type === "hour")?.value);

  const [year, month, day] = date.split("-").map(Number);
  const scheduleDate = new Date(Date.UTC(year, month - 1, day));
  if (hour < 7) scheduleDate.setUTCDate(scheduleDate.getUTCDate() - 1);
  return scheduleDate;
}

function localMinuteOfDay(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

export function shiftCoversInstant(
  shift: WorkerShift,
  at: Date,
  timeZone: string = getHotelTimeZone()
): boolean {
  if (!Number.isFinite(at.getTime())) return false;
  const minute = localMinuteOfDay(at, timeZone);
  switch (shift) {
    case WorkerShift.MORNING:
      return minute >= 7 * 60 && minute < 15 * 60;
    case WorkerShift.EVENING:
      return minute >= 15 * 60 && minute < 23 * 60;
    case WorkerShift.NIGHT:
      return minute >= 23 * 60 || minute < 7 * 60;
    case WorkerShift.DAY_OFF:
      return false;
    default:
      return false;
  }
}

export function evaluateWorkerAvailability(params: {
  at: Date;
  shift: WorkerShift | null;
  isActive: boolean;
  isAvailable: boolean;
  timeZone?: string;
}): WorkerAvailability {
  const { at, shift, isActive, isAvailable, timeZone = getHotelTimeZone() } = params;
  const status: WorkerAvailabilityStatus = !isActive
    ? "INACTIVE"
    : shift === WorkerShift.DAY_OFF
      ? "DAY_OFF"
      : !shift
        ? "NO_SCHEDULE"
        : !isAvailable
          ? "UNAVAILABLE"
          : shiftCoversInstant(shift, at, timeZone)
            ? "AVAILABLE"
            : "OUTSIDE_SHIFT";

  return {
    status,
    label: STATUS_LABELS[status],
    eligible: status === "AVAILABLE",
    at: at.toISOString(),
  };
}

/** Resolve and calculate availability once for each employee in a result set. */
export async function attachWorkerAvailability<T extends {
  id: string;
  role?: string;
  isActive?: boolean;
  employeeProfile?: { isAvailable?: boolean } | null;
}>(workers: T[], at: Date): Promise<Array<T & { availability: WorkerAvailability | null }>> {
  const eligibleWorkers = workers.filter(
    (worker) => worker.role === "EMPLOYEE" && worker.employeeProfile
  );
  const workerIds = eligibleWorkers.map((worker) => worker.id);
  const scheduleDay = getShiftScheduleDay(at);
  const schedules = workerIds.length
    ? await prisma.workerShiftSchedule.findMany({
        where: { workerId: { in: workerIds }, businessDay: scheduleDay },
        select: { workerId: true, shift: true },
      })
    : [];
  const shiftByWorker = new Map(schedules.map((schedule) => [schedule.workerId, schedule.shift]));

  return workers.map((worker) => {
    if (worker.role !== "EMPLOYEE" || !worker.employeeProfile) {
      return { ...worker, availability: null };
    }
    return {
      ...worker,
      availability: evaluateWorkerAvailability({
        at,
        shift: shiftByWorker.get(worker.id) ?? null,
        isActive: worker.isActive !== false,
        isAvailable: worker.employeeProfile.isAvailable !== false,
      }),
    };
  });
}

/** Load one worker's schedule for an instant and evaluate assignment eligibility. */
export async function getWorkerAvailabilityAt(params: {
  workerId: string;
  at: Date;
  isActive: boolean;
  isAvailable: boolean;
}): Promise<WorkerAvailability> {
  const schedule = await prisma.workerShiftSchedule.findUnique({
    where: {
      workerId_businessDay: {
        workerId: params.workerId,
        businessDay: getShiftScheduleDay(params.at),
      },
    },
    select: { shift: true },
  });

  return evaluateWorkerAvailability({
    at: params.at,
    shift: schedule?.shift ?? null,
    isActive: params.isActive,
    isAvailable: params.isAvailable,
  });
}
