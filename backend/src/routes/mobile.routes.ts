import { Router } from "express";
import { body } from "express-validator";
import {
  heartbeat,
  listTasks,
  getTask,
  scanEntry,
  scanExit,
  getMobileMessages,
  addMobileMessage,
} from "../controllers/mobile.controller";
import { listMyDailyTasks, startDailyTask, completeDailyTask } from "../controllers/dailyCleaning.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

// Auth + Role EMPLOYEE (et eventuellement ADMIN pour tests)
router.use(authMiddleware, requireRole(UserRole.EMPLOYEE));

/**
 * POST /api/mobile/heartbeat
 */
router.post("/heartbeat", heartbeat);

/**
 * GET /api/mobile/tasks
 */
router.get("/tasks", listTasks);

/**
 * GET /api/mobile/tasks/:id
 */
router.get("/tasks/:id", getTask);

/**
 * POST /api/mobile/tasks/:id/scan-entry
 */
router.post(
  "/tasks/:id/scan-entry",
  [
    body("workerRoomQrToken")
      .isString()
      .withMessage("Token QR requis."),
  ],
  validateRequest,
  scanEntry
);

/**
 * POST /api/mobile/tasks/:id/scan-exit
 */
router.post(
  "/tasks/:id/scan-exit",
  [
    body("workerRoomQrToken")
      .isString()
      .withMessage("Token QR requis."),
    body("result")
      .isString()
      .isIn(["FIXED", "NOT_FIXED"])
      .withMessage("Le resultat doit etre FIXED ou NOT_FIXED."),
    body("employeeComment")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Le commentaire ne doit pas depasser 1000 caracteres."),
  ],
  validateRequest,
  scanExit
);

/**
 * GET /api/mobile/tasks/:id/messages
 */
router.get("/tasks/:id/messages", getMobileMessages);

/**
 * POST /api/mobile/tasks/:id/messages
 */
router.post(
  "/tasks/:id/messages",
  [
    body("message")
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Le message est requis (max 2000 caracteres)."),
  ],
  validateRequest,
  addMobileMessage
);

/**
 * GET /api/mobile/daily-cleaning-tasks
 * Worker's daily cleaning assignments for today's business day.
 */
router.get("/daily-cleaning-tasks", listMyDailyTasks);

/**
 * PATCH /api/mobile/daily-cleaning-tasks/:id/start
 */
router.patch("/daily-cleaning-tasks/:id/start", startDailyTask);

/**
 * PATCH /api/mobile/daily-cleaning-tasks/:id/complete
 */
router.patch(
  "/daily-cleaning-tasks/:id/complete",
  [
    body("done").isBoolean().withMessage("done doit être true ou false."),
    body("note").optional().isString().trim().isLength({ max: 500 }),
  ],
  validateRequest,
  completeDailyTask
);

export default router;
