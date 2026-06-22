import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import fs from "fs";
import path from "path";

// Polyfill WebSocket pour Node.js < 22 (requis par le client Realtime de Supabase)
if (typeof (global as any).WebSocket === "undefined") {
  try {
    (global as any).WebSocket = require("ws");
  } catch (err) {
    console.warn("[StorageService] Failed to load 'ws' polyfill:", err);
  }
}

// Initialiser le client Supabase uniquement si les clés sont fournies
const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export class StorageService {
  /**
   * Uploade une image d'événement vers Supabase Storage si configuré, sinon la conserve localement.
   * Retourne l'URL publique et optionnellement le chemin de stockage dans le bucket.
   */
  async uploadEventImage(file: Express.Multer.File): Promise<{ imageUrl: string; imagePath?: string }> {
    if (!supabase || !env.SUPABASE_STORAGE_BUCKET) {
      console.log("[StorageService] Supabase non configuré. Conservation locale de l'image.");
      return {
        imageUrl: `/uploads/events/${file.filename}`,
      };
    }

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const bucketName = env.SUPABASE_STORAGE_BUCKET;
      const key = `events/${file.filename}`;

      // Upload vers le bucket
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(key, fileBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        console.error("[StorageService] Erreur lors de l'upload Supabase:", error);
        throw error;
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(key);

      // Nettoyer le fichier temporaire local
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (unlinkErr) {
        console.error("[StorageService] Échec de la suppression du fichier temporaire local :", unlinkErr);
      }

      return {
        imageUrl: publicUrl,
        imagePath: key,
      };
    } catch (err) {
      console.error("[StorageService] Échec de l'upload :", err);
      throw err;
    }
  }

  /**
   * Supprime une image d'événement.
   * Gère à la fois le chemin dans le bucket Supabase et le chemin local (/uploads/events/...).
   */
  async deleteEventImage(imageIdentifier?: string | null): Promise<void> {
    if (!imageIdentifier) return;

    // Si c'est une URL publique complète, essayer d'extraire la clé relative du bucket
    if (imageIdentifier.startsWith("http://") || imageIdentifier.startsWith("https://")) {
      if (env.SUPABASE_STORAGE_BUCKET) {
        const bucketMarker = `/${env.SUPABASE_STORAGE_BUCKET}/`;
        const markerIndex = imageIdentifier.indexOf(bucketMarker);
        if (markerIndex !== -1) {
          const key = imageIdentifier.substring(markerIndex + bucketMarker.length);
          return this.deleteEventImage(key);
        }
      }
    }

    // Si c'est un chemin de stockage Supabase (ex: commence par "events/")
    if (imageIdentifier.startsWith("events/")) {
      if (!supabase || !env.SUPABASE_STORAGE_BUCKET) {
        console.warn("[StorageService] Supabase non configuré pour la suppression du chemin :", imageIdentifier);
        return;
      }
      try {
        const { error } = await supabase.storage
          .from(env.SUPABASE_STORAGE_BUCKET)
          .remove([imageIdentifier]);
        if (error) {
          console.error(`[StorageService] Échec de la suppression sur Supabase (${imageIdentifier}):`, error);
        } else {
          console.log(`[StorageService] Image supprimée sur Supabase : ${imageIdentifier}`);
        }
      } catch (err) {
        console.error("[StorageService] Erreur lors de la suppression sur Supabase :", err);
      }
    }
    // Si c'est un chemin local relatif (ex: commence par "/uploads/")
    else if (imageIdentifier.startsWith("/uploads/")) {
      const localPath = path.resolve(__dirname, "../..", imageIdentifier.substring(1));
      try {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`[StorageService] Image locale supprimée : ${localPath}`);
        }
      } catch (err) {
        console.error("[StorageService] Échec de la suppression de l'image locale :", err);
      }
    }
  }
}
