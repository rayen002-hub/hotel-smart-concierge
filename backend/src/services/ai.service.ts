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
    try {
      const response = await axios.post(
        `${this.baseUrl}/detect-language`,
        { message },
        { timeout: 5000, headers: { "Content-Type": "application/json" } }
      );
      return response.data.language || "fr";
    } catch (error: any) {
      console.warn(`[AI SERVICE WARNING] Detection de langue echouee: ${error.message}`);
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
    if (sourceLang === targetLang) return message;

    try {
      const response = await axios.post(
        `${this.baseUrl}/translate`,
        {
          message,
          source_language: sourceLang,
          target_language: targetLang,
        },
        { timeout: 60000, headers: { "Content-Type": "application/json" } }
      );
      return response.data.translated_text || message;
    } catch (error: any) {
      console.warn(`[AI SERVICE WARNING] Traduction echouee (${sourceLang}->${targetLang}): ${error.message}`);
      return message; // fallback: message original
    }
  }
}
