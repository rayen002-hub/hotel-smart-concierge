import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./auth.service";

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface CheckinTokenPayload {
  type: "CHECKIN_ACCESS";
}

// -----------------------------------------------------------
// Generate / Verify
// -----------------------------------------------------------

/**
 * Generer un token JWT pour l'acces au formulaire de check-in.
 * Le token expire apres 24h.
 */
export const generateCheckinToken = (): string => {
  const payload: CheckinTokenPayload = {
    type: "CHECKIN_ACCESS",
  };

  return jwt.sign(payload, env.CHECKIN_QR_SECRET, {
    expiresIn: "24h",
  } as jwt.SignOptions);
};

/**
 * Verifier et valider un token de check-in.
 */
export const verifyCheckinToken = (token: string): void => {
  let decoded: CheckinTokenPayload;

  try {
    decoded = jwt.verify(token, env.CHECKIN_QR_SECRET) as CheckinTokenPayload;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Le lien de check-in a expire. Veuillez scanner un nouveau QR code.", 401);
    }
    throw new AppError("Token de check-in invalide.", 401);
  }

  if (decoded.type !== "CHECKIN_ACCESS") {
    throw new AppError("Type de token invalide.", 401);
  }
};
