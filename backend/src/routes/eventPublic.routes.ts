import { Router, Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service";

const router = Router();
const eventService = new EventService();

/**
 * GET /api/public/events
 * Lister les evenements publies et a venir.
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.listPublished();
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

export default router;
