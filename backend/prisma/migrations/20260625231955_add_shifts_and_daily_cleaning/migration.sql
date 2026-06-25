-- CreateEnum
CREATE TYPE "WorkerShift" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'DAY_OFF');

-- CreateEnum
CREATE TYPE "DailyCleaningStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "worker_shift_schedules" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "businessDay" TIMESTAMP(3) NOT NULL,
    "shift" "WorkerShift" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cleaning_tasks" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "businessDay" TIMESTAMP(3) NOT NULL,
    "status" "DailyCleaningStatus" NOT NULL DEFAULT 'ASSIGNED',
    "note" TEXT,
    "assignedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_cleaning_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_shift_schedules_workerId_businessDay_key" ON "worker_shift_schedules"("workerId", "businessDay");

-- AddForeignKey
ALTER TABLE "worker_shift_schedules" ADD CONSTRAINT "worker_shift_schedules_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_shift_schedules" ADD CONSTRAINT "worker_shift_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cleaning_tasks" ADD CONSTRAINT "daily_cleaning_tasks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cleaning_tasks" ADD CONSTRAINT "daily_cleaning_tasks_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cleaning_tasks" ADD CONSTRAINT "daily_cleaning_tasks_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
