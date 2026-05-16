import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { env } from "../config/env";

/**
 * Service d'authentification.
 * Gere login, recuperation du profil et logout.
 */
export class AuthService {
  /**
   * Authentifier un utilisateur par email et mot de passe.
   * Met a jour lastLoginAt et lastSeenAt pour les employes.
   */
  async login(email: string, password: string) {
    // Chercher l'utilisateur avec son profil employe
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employeeProfile: true },
    });

    if (!user) {
      throw new AppError("Email ou mot de passe incorrect.", 401);
    }

    // Verifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Email ou mot de passe incorrect.", 401);
    }

    // Mettre a jour lastLoginAt et lastSeenAt pour les employes
    if (user.employeeProfile) {
      await prisma.employeeProfile.update({
        where: { userId: user.id },
        data: {
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    }

    // Generer le token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.employeeProfile?.department || null,
      },
    };
  }

  /**
   * Recuperer le profil de l'utilisateur connecte.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    // Mettre a jour lastSeenAt
    if (user.employeeProfile) {
      await prisma.employeeProfile.update({
        where: { userId: user.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.employeeProfile?.department || null,
      isAvailable: user.employeeProfile?.isAvailable ?? null,
      createdAt: user.createdAt,
    };
  }

  /**
   * Deconnecter un utilisateur.
   * Met a jour lastLogoutAt pour les employes.
   */
  async logout(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    if (user.employeeProfile) {
      await prisma.employeeProfile.update({
        where: { userId: user.id },
        data: { lastLogoutAt: new Date() },
      });
    }

    return { message: "Deconnexion reussie." };
  }
}

/**
 * Classe d'erreur applicative avec code HTTP.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}
