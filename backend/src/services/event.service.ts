import { PrismaClient } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

/**
 * Service de gestion des evenements hotel.
 */
export class EventService {

  /**
   * Lister les evenements publies et a venir (vue publique).
   */
  async listPublished() {
    return prisma.hotelEvent.findMany({
      where: {
        isPublished: true,
        eventDate: { gte: new Date() },
      },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        imageUrl: true,
      },
    });
  }

  /**
   * Lister tous les evenements (vue staff).
   */
  async listAll() {
    return prisma.hotelEvent.findMany({
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        imageUrl: true,
        isPublished: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Recuperer un evenement par son ID.
   */
  async getById(id: string) {
    return prisma.hotelEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        imageUrl: true,
        imagePath: true,
        isPublished: true,
        createdAt: true,
      },
    });
  }

  /**
   * Creer un evenement.
   */
  async create(params: {
    title: string;
    description: string;
    eventDate: string;
    imageUrl?: string;
    imagePath?: string;
    isPublished: boolean;
    userId: string;
  }) {
    const event = await prisma.hotelEvent.create({
      data: {
        title: params.title,
        description: params.description,
        eventDate: new Date(params.eventDate),
        imageUrl: params.imageUrl || null,
        imagePath: params.imagePath || null,
        isPublished: params.isPublished,
        createdById: params.userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        imageUrl: true,
        imagePath: true,
        isPublished: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      actorId: params.userId,
      action: "CREATE_EVENT",
      entity: "HotelEvent",
      entityId: event.id,
      metadata: { title: params.title },
    });

    return event;
  }

  /**
   * Modifier un evenement.
   */
  async update(
    id: string,
    params: {
      title?: string;
      description?: string;
      eventDate?: string;
      imageUrl?: string;
      imagePath?: string;
      isPublished?: boolean;
    },
    userId: string
  ) {
    const data: any = {};
    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.eventDate !== undefined) data.eventDate = new Date(params.eventDate);
    if (params.imageUrl !== undefined) data.imageUrl = params.imageUrl;
    if (params.imagePath !== undefined) data.imagePath = params.imagePath;
    if (params.isPublished !== undefined) data.isPublished = params.isPublished;

    const event = await prisma.hotelEvent.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        imageUrl: true,
        imagePath: true,
        isPublished: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      actorId: userId,
      action: "UPDATE_EVENT",
      entity: "HotelEvent",
      entityId: event.id,
      metadata: { updatedFields: Object.keys(params).filter((k) => (params as any)[k] !== undefined) },
    });

    return event;
  }

  /**
   * Supprimer un evenement.
   */
  async delete(id: string, userId: string) {
    const event = await prisma.hotelEvent.findUnique({
      where: { id },
      select: { title: true, imageUrl: true, imagePath: true },
    });

    await prisma.hotelEvent.delete({ where: { id } });

    await createAuditLog({
      actorId: userId,
      action: "DELETE_EVENT",
      entity: "HotelEvent",
      entityId: id,
      metadata: { title: event?.title },
    });

    // Retourner l'événement supprimé pour permettre au caller de nettoyer l'image
    return event;
  }
}
