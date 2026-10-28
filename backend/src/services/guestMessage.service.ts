import { PrismaClient, MessageSenderType } from "@prisma/client";
import { AIService } from "./ai.service";

const prisma = new PrismaClient();
const aiService = new AIService();

/**
 * Service de messagerie client-reception avec traduction automatique.
 */
export class GuestMessageService {

  /**
   * Determine la langue dominante du client dans une conversation.
   *
   * Strategie double pour contrer les mauvaises detections sur les messages courts :
   *  1. Re-detecte la langue sur la concatenation de TOUS les messages precedents
   *     + le message courant (plus de texte = modele plus fiable).
   *  2. Vote majoritaire entre les langues stockees + les deux detections.
   *     Le resultat de la detection combinee recoit un poids double.
   *
   * Resultat : une mauvaise detection sur un message court n'impacte plus
   * la langue de traduction des reponses du staff.
   */
  private async resolveClientLanguage(
    reservationId: string,
    candidateLang: string,
    candidateMessage: string
  ): Promise<string> {
    // Recuperer tous les messages precedents du client pour cette reservation
    const priorMsgs = await prisma.guestStaffMessage.findMany({
      where: {
        reservationId,
        senderType: MessageSenderType.CLIENT,
        detectedLanguage: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: { detectedLanguage: true, originalMessage: true },
    });

    if (priorMsgs.length === 0) {
      // Aucun historique — utiliser la detection courante telle quelle
      return candidateLang;
    }

    // Concatener tous les messages precedents + le message courant pour la re-detection
    // Plus de texte = bien meilleure precision du modele de detection
    const allText = [
      ...priorMsgs.map((m) => m.originalMessage),
      candidateMessage,
    ]
      .filter(Boolean)
      .join(" ");

    const combinedDetected = await aiService.detectLanguage(allText);

    // Vote majoritaire : langues stockees + candidat courant + detection combinee (poids x2)
    const langCounts: Record<string, number> = {};
    for (const m of priorMsgs) {
      const l = m.detectedLanguage!;
      langCounts[l] = (langCounts[l] || 0) + 1;
    }
    langCounts[candidateLang] = (langCounts[candidateLang] || 0) + 1;
    // La detection sur le texte complet est plus fiable -> poids double
    langCounts[combinedDetected] = (langCounts[combinedDetected] || 0) + 2;

    const dominant = Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0][0];
    console.log(
      `[GuestMessageService] resolveClientLanguage — candidate: "${candidateLang}", combined: "${combinedDetected}", dominant: "${dominant}" | votes: ${JSON.stringify(langCounts)}`
    );
    return dominant;
  }

  /**
   * Creer un message envoye par le client.
   * Detecte la langue (avec consolidation historique), traduit en FR pour le staff.
   */
  async createFromClient(params: {
    message: string;
    reservationId: string;
    roomId: string;
  }) {
    // 1. Detection initiale sur le message courant
    const rawDetected = await aiService.detectLanguage(params.message);

    // 2. Consolider avec l'historique pour fiabilite maximale
    const detectedLanguage = await this.resolveClientLanguage(
      params.reservationId,
      rawDetected,
      params.message
    );

    // 3. Traduire vers FR pour le staff
    const staffMessage = await aiService.translateMessage(
      params.message,
      detectedLanguage,
      "fr"
    );

    // 4. Sauvegarder
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
    // 1. Recuperer TOUTES les langues detectees pour cette reservation
    const allClientMsgs = await prisma.guestStaffMessage.findMany({
      where: {
        reservationId: params.reservationId,
        senderType: MessageSenderType.CLIENT,
        detectedLanguage: { not: null },
      },
      select: { detectedLanguage: true },
    });

    // 2. Vote majoritaire sur les langues detectees
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
