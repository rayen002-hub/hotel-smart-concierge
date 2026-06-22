import { Router, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { EventService } from "../services/event.service";
import { StorageService } from "../services/storage.service";

const router = Router();
const eventService = new EventService();
const storageService = new StorageService();

// ── Multer config ────────────────────────────────────────────────────

const uploadsDir = path.resolve(__dirname, "../../uploads/events");

// Creer le dossier s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `event-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorise. Formats acceptes: jpg, jpeg, png, webp."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

// Tous les endpoints requirent authentification + role RECEPTIONIST (ou ADMIN)
router.use(authMiddleware);
router.use(requireRole("RECEPTIONIST"));

/**
 * GET /api/events
 * Liste de tous les evenements (vue staff).
 */
router.get("/", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.listAll();
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/events
 * Creer un evenement (multipart/form-data).
 */
router.post(
  "/",
  upload.single("image"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title, description, eventDate, isPublished } = req.body;

      // Validation
      if (!title || !description || !eventDate) {
        res.status(400).json({
          success: false,
          error: "Champs obligatoires manquants: title, description, eventDate.",
        });
        return;
      }

      // Valider la date
      const parsedDate = new Date(eventDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          error: "Format de date invalide.",
        });
        return;
      }

      let imageUrl: string | undefined = undefined;
      let imagePath: string | undefined = undefined;

      if (req.file) {
        const uploadResult = await storageService.uploadEventImage(req.file);
        imageUrl = uploadResult.imageUrl;
        imagePath = uploadResult.imagePath;
      }

      const event = await eventService.create({
        title,
        description,
        eventDate,
        imageUrl,
        imagePath,
        isPublished: isPublished === "true" || isPublished === true,
        userId: req.userId!,
      });

      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/events/:id
 * Modifier un evenement.
 */
router.patch(
  "/:id",
  upload.single("image"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { title, description, eventDate, isPublished } = req.body;

      const params: any = {};
      if (title !== undefined) params.title = title;
      if (description !== undefined) params.description = description;
      if (eventDate !== undefined) {
        const parsedDate = new Date(eventDate);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({ success: false, error: "Format de date invalide." });
          return;
        }
        params.eventDate = eventDate;
      }
      if (isPublished !== undefined) params.isPublished = isPublished === "true" || isPublished === true;
      if (req.file) {
        // Supprimer l'ancienne image si elle existe
        try {
          const existingEvent = await eventService.getById(id as string);
          if (existingEvent) {
            await storageService.deleteEventImage(existingEvent.imagePath || existingEvent.imageUrl);
          }
        } catch (err) {
          console.error("[PATCH Event] Failed to fetch or delete existing image:", err);
        }

        const uploadResult = await storageService.uploadEventImage(req.file);
        params.imageUrl = uploadResult.imageUrl;
        params.imagePath = uploadResult.imagePath;
      }

      const event = await eventService.update(id as string, params, req.userId!);
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/events/:id
 * Supprimer un evenement.
 */
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deletedEvent = await eventService.delete(id as string, req.userId!);
    
    // Supprimer l'image associee si elle existe
    if (deletedEvent) {
      await storageService.deleteEventImage(deletedEvent.imagePath || deletedEvent.imageUrl);
    }

    res.status(200).json({ success: true, message: "Evenement supprime." });
  } catch (error) {
    next(error);
  }
});

export default router;
