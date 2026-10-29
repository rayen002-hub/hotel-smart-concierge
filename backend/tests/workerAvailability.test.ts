import { WorkerShift } from "@prisma/client";
import {
  evaluateWorkerAvailability,
  getShiftScheduleDay,
  shiftCoversInstant,
} from "../src/services/workerAvailability.service";

const HOTEL_TZ = "Africa/Tunis";
const local = (iso: string) => new Date(iso);

describe("worker shift availability", () => {
  it("marks a rest day ineligible", () => {
    const result = evaluateWorkerAvailability({
      at: local("2026-10-30T16:00:00.000Z"), // 17:00 hotel time
      shift: WorkerShift.DAY_OFF,
      isActive: true,
      isAvailable: true,
      timeZone: HOTEL_TZ,
    });
    expect(result).toMatchObject({ status: "DAY_OFF", label: "En repos", eligible: false });
  });

  it("does not cover a 17:00 complaint with the 07:00–15:00 shift", () => {
    expect(shiftCoversInstant(
      WorkerShift.MORNING,
      local("2026-10-30T16:00:00.000Z"),
      HOTEL_TZ
    )).toBe(false);
  });

  it("covers a 17:00 complaint with the 15:00–23:00 shift", () => {
    expect(shiftCoversInstant(
      WorkerShift.EVENING,
      local("2026-10-30T16:00:00.000Z"),
      HOTEL_TZ
    )).toBe(true);
  });

  it("treats the shift end as exclusive and the next shift start as inclusive", () => {
    const at15 = local("2026-10-30T14:00:00.000Z"); // 15:00 hotel time
    const at23 = local("2026-10-30T22:00:00.000Z"); // 23:00 hotel time
    expect(shiftCoversInstant(WorkerShift.MORNING, at15, HOTEL_TZ)).toBe(false);
    expect(shiftCoversInstant(WorkerShift.EVENING, at15, HOTEL_TZ)).toBe(true);
    expect(shiftCoversInstant(WorkerShift.EVENING, at23, HOTEL_TZ)).toBe(false);
    expect(shiftCoversInstant(WorkerShift.NIGHT, at23, HOTEL_TZ)).toBe(true);
  });

  it("reports a missing schedule instead of treating the worker as available", () => {
    const result = evaluateWorkerAvailability({
      at: local("2026-10-30T16:00:00.000Z"),
      shift: null,
      isActive: true,
      isAvailable: true,
      timeZone: HOTEL_TZ,
    });
    expect(result).toMatchObject({ status: "NO_SCHEDULE", label: "Aucun planning valide", eligible: false });
  });

  it("uses the shift-start date for the overnight period after midnight", () => {
    const afterMidnight = local("2026-10-31T05:30:00.000Z"); // 06:30 hotel time
    expect(getShiftScheduleDay(afterMidnight, HOTEL_TZ).toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(shiftCoversInstant(WorkerShift.NIGHT, afterMidnight, HOTEL_TZ)).toBe(true);
    expect(shiftCoversInstant(WorkerShift.NIGHT, local("2026-10-31T06:00:00.000Z"), HOTEL_TZ)).toBe(false); // 07:00
  });

  it("keeps manual and account availability as independent eligibility gates", () => {
    const at = local("2026-10-30T16:00:00.000Z");
    expect(evaluateWorkerAvailability({ at, shift: WorkerShift.EVENING, isActive: true, isAvailable: false, timeZone: HOTEL_TZ }))
      .toMatchObject({ status: "UNAVAILABLE", eligible: false });
    expect(evaluateWorkerAvailability({ at, shift: WorkerShift.EVENING, isActive: false, isAvailable: true, timeZone: HOTEL_TZ }))
      .toMatchObject({ status: "INACTIVE", eligible: false });
  });
});
