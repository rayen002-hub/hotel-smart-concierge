import { StorageService } from "../src/services/storage.service";
import { env } from "../src/config/env";
import fs from "fs";
import path from "path";

/**
 * StorageService Integration Tests
 *
 * These tests run against the real Supabase bucket when credentials are
 * configured in .env, and fall back to local-storage assertions otherwise.
 */

const uploadsDir = path.join(__dirname, "../uploads/events");
const storageService = new StorageService();
const isSupabaseConfigured =
  !!env.SUPABASE_URL && !!env.SUPABASE_SERVICE_ROLE_KEY && !!env.SUPABASE_STORAGE_BUCKET;

/** Minimal Multer file shape matching what StorageService needs. */
interface MulterFile {
  path: string;
  filename: string;
  mimetype: string;
  originalname: string;
  fieldname: string;
  encoding: string;
  size: number;
  stream: any;
  destination: string;
  buffer: Buffer;
}

/** Helper: create a temporary image file and return a Multer-compatible object. */
function createMockFile(suffix: string): MulterFile {
  const filename = `test-image-${Date.now()}-${suffix}.png`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")); // 1x1 PNG
  return {
    path: filePath,
    filename,
    mimetype: "image/png",
    originalname: "test-image.png",
    fieldname: "image",
    encoding: "7bit",
    size: fs.statSync(filePath).size,
    stream: null,
    destination: uploadsDir,
    buffer: fs.readFileSync(filePath),
  };
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeAll(() => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

// ── Tests ────────────────────────────────────────────────────────────

describe("StorageService", () => {
  describe("uploadEventImage", () => {
    it("should return an imageUrl after uploading", async () => {
      const file = createMockFile("upload");
      const result = await storageService.uploadEventImage(file as any);

      expect(result).toHaveProperty("imageUrl");
      expect(typeof result.imageUrl).toBe("string");
      expect(result.imageUrl.length).toBeGreaterThan(0);
    });

    if (isSupabaseConfigured) {
      it("should upload to Supabase and return a public URL + imagePath", async () => {
        const file = createMockFile("supa-upload");
        const result = await storageService.uploadEventImage(file as any);

        expect(result.imageUrl).toMatch(/^https:\/\/.*supabase.*$/);
        expect(result.imagePath).toBeDefined();
        expect(result.imagePath).toMatch(/^events\//);

        // The local temp file should have been deleted by the service
        expect(fs.existsSync(file.path)).toBe(false);

        // Clean up the uploaded file on Supabase
        await storageService.deleteEventImage(result.imagePath!);
      });
    } else {
      it("should fall back to local storage when Supabase is not configured", async () => {
        const file = createMockFile("local-upload");
        const result = await storageService.uploadEventImage(file as any);

        expect(result.imageUrl).toMatch(/^\/uploads\/events\//);
        expect(result.imagePath).toBeUndefined();

        // Clean up local file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
  });

  describe("deleteEventImage", () => {
    it("should not throw when called with null or undefined", async () => {
      await expect(storageService.deleteEventImage(null)).resolves.not.toThrow();
      await expect(storageService.deleteEventImage(undefined)).resolves.not.toThrow();
      await expect(storageService.deleteEventImage("")).resolves.not.toThrow();
    });

    it("should not throw when deleting a non-existent local path", async () => {
      await expect(
        storageService.deleteEventImage("/uploads/events/does-not-exist.png")
      ).resolves.not.toThrow();
    });

    if (isSupabaseConfigured) {
      it("should upload then delete a file on Supabase without error", async () => {
        const file = createMockFile("supa-delete");
        const { imagePath } = await storageService.uploadEventImage(file as any);

        expect(imagePath).toBeDefined();
        await expect(storageService.deleteEventImage(imagePath!)).resolves.not.toThrow();
      });

      it("should handle deletion via full public URL", async () => {
        const file = createMockFile("supa-url-delete");
        const { imageUrl, imagePath } = await storageService.uploadEventImage(file as any);

        expect(imagePath).toBeDefined();
        // Delete using the full URL instead of the path key
        await expect(storageService.deleteEventImage(imageUrl)).resolves.not.toThrow();
      });
    }
  });
});
