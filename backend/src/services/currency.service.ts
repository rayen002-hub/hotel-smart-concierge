import prisma from "../config/prisma";
import { AppError } from "./auth.service";

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface ExternalRates {
  [currency: string]: number;
}

interface CachedRates {
  rates: ExternalRates;
  base: string;
  fetchedAt: number;
}

// -----------------------------------------------------------
// In-memory cache (6 hours TTL)
// -----------------------------------------------------------

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let cache: CachedRates | null = null;

const EXTERNAL_API_URL = "https://open.er-api.com/v6/latest/TND";

// -----------------------------------------------------------
// Service
// -----------------------------------------------------------

export class CurrencyService {

  /**
   * Recuperer les taux depuis l'API externe ExchangeRate-API.
   * Les resultats sont caches pendant 6 heures en memoire.
   * En cas d'echec de l'API externe, on fallback sur les taux manuels de la DB.
   */
  async getLatestRates(): Promise<{ rates: ExternalRates; base: string; source: string; cachedAt?: string }> {
    // Check cache
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return {
        rates: cache.rates,
        base: cache.base,
        source: "external_cached",
        cachedAt: new Date(cache.fetchedAt).toISOString(),
      };
    }

    // Fetch from external API
    try {
      const response = await fetch(EXTERNAL_API_URL);

      if (!response.ok) {
        throw new Error(`ExchangeRate-API responded with status ${response.status}`);
      }

      const data = await response.json() as { result: string; rates?: ExternalRates };

      if (data.result !== "success" || !data.rates) {
        throw new Error("ExchangeRate-API returned invalid data");
      }

      // Update cache
      cache = {
        rates: data.rates,
        base: "TND",
        fetchedAt: Date.now(),
      };

      console.log("[CurrencyService] Fetched rates from ExchangeRate-API successfully.");

      return {
        rates: cache.rates,
        base: cache.base,
        source: "external",
      };
    } catch (err: any) {
      console.warn("[CurrencyService] External API failed, falling back to DB rates:", err.message);
      return this.getFallbackRates();
    }
  }

  /**
   * Fallback : utiliser les taux manuels de la DB.
   */
  private async getFallbackRates(): Promise<{ rates: ExternalRates; base: string; source: string }> {
    const dbRates = await prisma.currencyRate.findMany();

    const rates: ExternalRates = { TND: 1 };
    for (const r of dbRates) {
      // rateToTnd = combien de TND pour 1 devise
      // Pour l'API format (base TND) : rate[devise] = 1 / rateToTnd
      rates[r.currency] = r.rateToTnd > 0 ? 1 / r.rateToTnd : 0;
    }

    return {
      rates,
      base: "TND",
      source: "database_fallback",
    };
  }

  /**
   * Convertir un montant d'une devise vers une autre.
   * Formule : amountTo = amount * rate[to] / rate[from]
   */
  async convert(from: string, to: string, amount: number): Promise<{
    from: string;
    to: string;
    amount: number;
    result: number;
    rate: number;
    source: string;
  }> {
    if (amount <= 0) {
      throw new AppError("Le montant doit etre positif.", 400);
    }

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    const { rates, source } = await this.getLatestRates();

    const rateFrom = rates[fromUpper];
    const rateTo = rates[toUpper];

    if (rateFrom === undefined) {
      throw new AppError(`Devise source "${fromUpper}" non supportee.`, 400);
    }
    if (rateTo === undefined) {
      throw new AppError(`Devise destination "${toUpper}" non supportee.`, 400);
    }
    if (rateFrom === 0) {
      throw new AppError(`Taux de conversion pour "${fromUpper}" est zero.`, 400);
    }

    const conversionRate = rateTo / rateFrom;
    const result = amount * conversionRate;

    return {
      from: fromUpper,
      to: toUpper,
      amount,
      result: Math.round(result * 1000) / 1000, // 3 decimales
      rate: Math.round(conversionRate * 1000000) / 1000000,
      source,
    };
  }
}
