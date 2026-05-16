import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * Enregistrer une action dans l'audit log.
 */
export const createAuditLog = async (params: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) => {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || null,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  });
};
