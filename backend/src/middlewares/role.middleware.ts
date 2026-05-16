import { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AuthRequest } from "./auth.middleware";

/**
 * Middleware de controle d'acces par role.
 *
 * Utilisation :
 *   router.get("/admin-only", authMiddleware, requireRole("ADMIN"), handler);
 *   router.get("/managers",   authMiddleware, requireRole("ADMIN", "MAINTENANCE_MANAGER"), handler);
 *
 * ADMIN a toujours acces, meme s'il n'est pas dans la liste.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.userRole as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        success: false,
        error: "Non authentifie.",
      });
      return;
    }

    // ADMIN a toujours acces
    if (userRole === UserRole.ADMIN) {
      next();
      return;
    }

    // Verifier si le role de l'utilisateur est dans la liste autorisee
    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: "Acces refuse. Vous n'avez pas les permissions necessaires.",
      });
      return;
    }

    next();
  };
};
