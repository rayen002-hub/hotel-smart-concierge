import { PrismaClient, MessageSenderType } from "@prisma/client";
import { AIService } from "./ai.service";

const prisma = new PrismaClient();
const aiService = new AIService();

/**
 * Service de messagerie client-reception avec traduction automatique.
 */
export class GuestMessageService {

  /**
   * Creer un message envoye par le client.
   * Detecte la langue, traduit en FR pour le staff.
   */
  async createFromClient(params: {
    message: string;
    reservationId: string;
    roomId: string;
  }) {
    // 1. Detecter la langue du message courant
    const detectedLanguage = await aiService.detectLanguage(params.message);

    // 2. Traduire vers FR pour le staff
    const staffMessage = await aiService.translateMessage(
      params.message,
      detectedLanguage,
      "fr"
    );

    // 3. Sauvegarder
    const msg = await prisma.guestStaffMessage.create({
      data: {
        reservationId: params.reservationId,
        roomId: params.roomId,
        senderType: MessageSenderType.CLIENT,
        senderUserId: null,
        originalMessage: params.message,
        detectedLanguage,
        staffMessage,
        clientMessage: params.message,
      },
      select: {
        id: true,
        senderType: true,
        clientMessage: true,
        createdAt: true,
      },
    });

    return msg;
  }

  /**
   * Creer un message envoye par le staff (receptionniste).
   * Utilise le vote majoritaire sur toutes les langues detectees du client
   * pour determiner la langue cible — une seule mauvaise detection ne fausse
   * plus la traduction.
   */
  async createFromStaff(params: {
    message: string;
    reservationId: string;
    roomId: string;
    userId: string;
  }) {
    // 1. Recuperer TOUTES les langues detectees du client pour cette reservation
    const allClientMsgs = await prisma.guestStaffMessage.findMany({
      where: {
        reservationId: params.reservationId,
        senderType: MessageSenderType.CLIENT,
        detectedLanguage: { not: null },
      },
      select: { detectedLanguage: true },
    });

    // 2. Vote majoritaire sur les langues detectees
    //    Default = "en" (most common international hotel guest language)
    let clientLanguage = "en";
    if (allClientMsgs.length > 0) {
      const langCounts: Record<string, number> = {};
      for (const m of allClientMsgs) {
        const l = m.detectedLanguage!;
        langCounts[l] = (langCounts[l] || 0) + 1;
      }
      clientLanguage = Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0][0];
      console.log(
        `[GuestMessageService] createFromStaff — target language: "${clientLanguage}" | votes: ${JSON.stringify(langCounts)}`
      );
    }

    // 3. Traduire vers la langue du client
    const clientMessage = await aiService.translateMessage(
      params.message,
      "fr",
      clientLanguage
    );

    // 4. Sauvegarder
    const msg = await prisma.guestStaffMessage.create({
      data: {
        reservationId: params.reservationId,
        roomId: params.roomId,
        senderType: MessageSenderType.STAFF,
        senderUserId: params.userId,
        originalMessage: params.message,
        detectedLanguage: "fr",
        staffMessage: params.message,
        clientMessage,
      },
      select: {
        id: true,
        senderType: true,
        staffMessage: true,
        clientMessage: true,
        createdAt: true,
      },
    });

    return msg;
  }

  /**
   * Lister les messages d'une reservation.
   */
  async listByReservation(reservationId: string) {
    return prisma.guestStaffMessage.findMany({
      where: { reservationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        originalMessage: true,
        staffMessage: true,
        clientMessage: true,
        detectedLanguage: true,
        createdAt: true,
        readAt: true,
        senderUser: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Recuperer un message par son ID.
   */
  async getMessageById(id: string) {
    const msg = await prisma.guestStaffMessage.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        senderType: true,
        originalMessage: true,
        staffMessage: true,
        clientMessage: true,
        detectedLanguage: true,
        createdAt: true,
        readAt: true,
        reservationId: true,
        roomId: true,
        senderUser: { select: { id: true, name: true } },
      },
    });
    return msg;
  }

  /**
   * Lister les conversations groupees par reservation (vue staff).
   * Retourne une conversation par reservation avec le dernier message.
   */
  async listConversations() {
    // Recuperer les reservations qui ont des messages
    const conversations = await prisma.reservation.findMany({
      where: {
        guestStaffMessages: { some: {} },
      },
      select: {
        id: true,
        reservationNumber: true,
        guestFirstName: true,
        guestLastName: true,
        room: { select: { roomNumber: true } },
        guestStaffMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            senderType: true,
            staffMessage: true,
            createdAt: true,
            readAt: true,
          },
        },
        _count: {
          select: {
            guestStaffMessages: {
              where: {
                senderType: MessageSenderType.CLIENT,
                readAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return conversations.map((c) => ({
      reservationId: c.id,
      reservationNumber: c.reservationNumber,
      guestName: `${c.guestFirstName} ${c.guestLastName}`,
      roomNumber: c.room?.roomNumber || "—",
      lastMessage: c.guestStaffMessages[0] || null,
      unreadCount: c._count.guestStaffMessages,
    }));
  }

  /**
   * Recuperer le roomId d'une reservation.
   */
  async getReservationRoomId(reservationId: string): Promise<string | null> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { roomId: true },
    });
    return reservation?.roomId || null;
  }
}
