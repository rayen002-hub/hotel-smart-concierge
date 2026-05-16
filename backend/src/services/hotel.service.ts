import prisma from "../config/prisma";
import { AppError } from "./auth.service";
import { createAuditLog } from "../utils/audit";

/**
 * Service pour les informations de l'hotel et les devises.
 */
export class HotelService {
  // -----------------------------------------------------------
  // Hotel Info
  // -----------------------------------------------------------

  async getHotelInfos() {
    return prisma.hotelInfo.findMany({
      orderBy: { title: "asc" },
    });
  }

  async updateHotelInfo(
    id: string,
    data: { title?: string; content?: string; type?: string },
    actorId: string
  ) {
    const hotelInfo = await prisma.hotelInfo.findUnique({
      where: { id },
    });

    if (!hotelInfo) {
      throw new AppError("Information introuvable.", 404);
    }

    const updated = await prisma.hotelInfo.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actorId,
      action: "UPDATE_HOTEL_INFO",
      entity: "HotelInfo",
      entityId: id,
      metadata: { old: hotelInfo, new: updated },
    });

    return updated;
  }

  // -----------------------------------------------------------
  // Currency Rates
  // -----------------------------------------------------------

  async getCurrencyRates() {
    return prisma.currencyRate.findMany({
      orderBy: { currency: "asc" },
    });
  }

  async updateCurrencyRate(
    id: string,
    data: { rateToTnd: number },
    actorId: string
  ) {
    const rate = await prisma.currencyRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new AppError("Devise introuvable.", 404);
    }

    const updated = await prisma.currencyRate.update({
      where: { id },
      data: { rateToTnd: data.rateToTnd },
    });

    await createAuditLog({
      actorId,
      action: "UPDATE_CURRENCY_RATE",
      entity: "CurrencyRate",
      entityId: id,
      metadata: {
        currency: rate.currency,
        oldRate: rate.rateToTnd,
        newRate: updated.rateToTnd,
      },
    });

    return updated;
  }
}
