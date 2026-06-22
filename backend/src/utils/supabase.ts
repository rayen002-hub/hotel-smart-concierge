import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import fs from "fs";

// Polyfill WebSocket pour Node.js < 22 (requis par le client Realtime de Supabase)
if (typeof (global as any).WebSocket === "undefined") {
  try {
    (global as any).WebSocket = require("ws");
  } catch (err) {
    console.warn("[Supabase] Failed to load 'ws' polyfill:", err);
  }
}

// Initialiser le client Supabase uniquement si les clés sont fournies
export const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Uploade un fichier local vers Supabase Storage.
 * Retourne l'URL publique du fichier uploadé ou null si Supabase n'est pas configuré.
 */
export const uploadToSupabase = async (
  filePath: string,
  filename: string,
  mimeType: string
): Promise<string | null> => {
  if (!supabase || !env.SUPABASE_STORAGE_BUCKET) {
    console.log("[Supabase] Storage not configured or incomplete, keeping file locally");
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Upload vers le bucket Supabase dans le dossier "events"
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(`events/${filename}`, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("[Supabase] Error uploading file:", error);
      throw error;
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(`events/${filename}`);

    console.log(`[Supabase] File uploaded successfully. Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[Supabase] Exception during file upload:", error);
    throw error;
  }
};
