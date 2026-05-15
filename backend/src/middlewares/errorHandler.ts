import { Request, Response, NextFunction } from "express";

/**
 * Middleware de gestion globale des erreurs.
 * Capture toutes les erreurs non gerees et retourne une reponse JSON propre.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`[ERROR] ${err.message}`);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  const statusCode = (err as any).statusCode || 500;
  const message = err.message || "Erreur interne du serveur";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
