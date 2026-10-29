import prisma from "../config/prisma";
import { ReservationStatusService } from "../services/reservationStatus.service";

async function run(): Promise<void> {
  try {
    const summary = await new ReservationStatusService().updateExpiredStatuses();
    console.info("[reservation-status-job] completed", summary);
  } catch (error) {
    // Avoid printing query parameters or database connection details from ORM errors.
    const safeError = error instanceof Error ? error.name : "UnknownError";
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;
    console.error("[reservation-status-job] failed", { error: safeError, code });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
