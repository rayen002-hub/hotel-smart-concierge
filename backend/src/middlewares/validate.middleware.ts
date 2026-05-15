import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

/**
 * Middleware de validation express-validator.
 * Verifie les erreurs de validation et retourne une reponse 400 si necessaire.
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: "Erreur de validation.",
      details: errors.array().map((err) => ({
        field: (err as any).path,
        message: err.msg,
      })),
    });
    return;
  }

  next();
};
