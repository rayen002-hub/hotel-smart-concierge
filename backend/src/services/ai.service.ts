import axios from "axios";
import { env } from "../config/env";
import { ComplaintCategory } from "@prisma/client";

/**
 * Resultat de l'analyse IA d'une reclamation.
 */
export interface AIAnalysisResult {
  detectedLanguage: string | null;
  normalizedMessageEn: string | null;
  staffMessage: string;
  category: ComplaintCategory;
  categoryConfidence: number | null;
}

/**
 * Service de communication avec le micro-service IA (FastAPI).
 */
export class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.AI_SERVICE_URL;
  }

  /**
   * Analyser une reclamation via le service IA.
   *
   * Si le service IA ne repond pas, retourne un fallback
   * sans bloquer la creation de la reclamation.
   */
  async analyzeComplaint(message: string): Promise<AIAnalysisResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/analyze`,
        {
          message,
          staff_language: "fr",
        },
        {
          timeout: 60000, // 60 secondes (premiere traduction = chargement modele NLLB)
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = response.data;

      // Mapper la categorie retournee vers l'enum Prisma
      const category = this.mapCategory(data.category);

      return {
        detectedLanguage: data.detected_language || null,
        normalizedMessageEn: data.normalized_message_en || null,
        staffMessage: data.staff_message || message,
        category,
        categoryConfidence: data.category_confidence ?? null,
      };
    } catch (error: any) {
      // Ne pas bloquer la creation de reclamation
      console.warn(
        `[AI SERVICE WARNING] Impossible de contacter le service IA: ${error.message}`
      );
      console.warn(
        `[AI SERVICE WARNING] Fallback applique: category=OTHER, message original conserve.`
      );

      return {
        detectedLanguage: null,
        normalizedMessageEn: null,
        staffMessage: message,
        category: ComplaintCategory.OTHER,
        categoryConfidence: null,
      };
    }
  }

  /**
   * Mapper une categorie string vers l'enum ComplaintCategory.
   * Retourne OTHER si la categorie n'est pas reconnue.
   */
  private mapCategory(category: string): ComplaintCategory {
    const validCategories = Object.values(ComplaintCategory);
    const upper = (category || "").toUpperCase() as ComplaintCategory;

    if (validCategories.includes(upper)) {
      return upper;
    }

    console.warn(
      `[AI SERVICE WARNING] Categorie inconnue: "${category}". Fallback vers OTHER.`
    );
    return ComplaintCategory.OTHER;
  }

  /**
   * Detecter la langue d'un message.
   * Retourne le code ISO 639-1 (ex: "fr", "en", "es").
   */
  async detectLanguage(message: string): Promise<string> {
    const url = `${this.baseUrl}/detect-language`;
    console.log(`[AI] detectLanguage → POST ${url} | message length: ${message.length}`);
    try {
      const response = await axios.post(
        url,
        { message },
        // 30s: accounts for Hugging Face Space cold-start warm-up time
        { timeout: 30000, headers: { "Content-Type": "application/json" } }
      );
      const lang = response.data.language || "fr";
      console.log(`[AI] detectLanguage ← HTTP ${response.status} | detected: "${lang}" (confidence: ${response.data.confidence ?? "n/a"})`);
      return lang;
    } catch (error: any) {
      const code = error.response?.status ?? error.code ?? "UNKNOWN";
      console.warn(`[AI SERVICE WARNING] detectLanguage failed — ${code}: ${error.message}`);
      console.warn(`[AI SERVICE WARNING] Fallback: assuming language = "fr"`);
      return "fr"; // fallback
    }
  }

  /**
   * Traduire un message d'une langue source vers une langue cible.
   * Retourne le texte traduit ou le message original en cas d'erreur.
   */
  async translateMessage(
    message: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    if (sourceLang === targetLang) {
      console.log(`[AI] translateMessage — source === target ("${sourceLang}"), skipping translation, returning original.`);
      return message;
    }

    const url = `${this.baseUrl}/translate`;
    console.log(`[AI] translateMessage → POST ${url} | ${sourceLang} → ${targetLang} | message length: ${message.length}`);

    try {
      const response = await axios.post(
        url,
        {
          message,
          source_language: sourceLang,
          target_language: targetLang,
        },
        { timeout: 60000, headers: { "Content-Type": "application/json" } }
      );
      const translated = response.data.translated_text || message;
      console.log(`[AI] translateMessage ← HTTP ${response.status} | cached: ${response.data.cached ?? false} | result length: ${translated.length}`);
      return translated;
    } catch (error: any) {
      const code = error.response?.status ?? error.code ?? "UNKNOWN";
      const detail = error.response?.data?.detail ?? error.message;
      console.warn(`[AI SERVICE WARNING] translateMessage failed — ${sourceLang}→${targetLang} — ${code}: ${detail}`);
      console.warn(`[AI SERVICE WARNING] Fallback: returning original message untranslated.`);
      return message; // fallback: message original
    }
  }
}
