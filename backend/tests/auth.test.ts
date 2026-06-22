import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";

// Mock the prisma config module
jest.mock("../src/config/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    employeeProfile: {
      update: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("Auth and Role access control", () => {
  const password = "correctpassword123";
  const passwordHash = bcrypt.hashSync(password, 10);

  const mockReceptionistUser = {
    id: "user-receptionist-id",
    name: "Receptionist Test",
    email: "reception@hotel.com",
    passwordHash,
    role: "RECEPTIONIST",
    employeeProfile: {
      id: "profile-receptionist-id",
      userId: "user-receptionist-id",
      department: "RECEPTION",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should return a JWT token and user info on valid login", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReceptionistUser);
      (prisma.employeeProfile.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "reception@hotel.com", password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("role", "RECEPTIONIST");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "reception@hotel.com" },
        include: { employeeProfile: true },
      });
    });

    it("should return 401 on incorrect password", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReceptionistUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "reception@hotel.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Email ou mot de passe incorrect.");
    });

    it("should return 401 when user is not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@hotel.com", password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Email ou mot de passe incorrect.");
    });
  });

  describe("Route protection and Role middleware", () => {
    it("should return 401 when accessing a protected route without a token", async () => {
      const res = await request(app).get("/api/rooms");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Token manquant. Veuillez vous connecter.");
    });

    it("should return 403 when an EMPLOYEE tries to access receptionist-restricted routes", async () => {
      // Sign token as EMPLOYEE
      const employeeToken = jwt.sign(
        { userId: "user-employee-id", role: "EMPLOYEE" },
        env.JWT_SECRET
      );

      const res = await request(app)
        .get("/api/rooms")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Acces refuse");
    });

    it("should allow RECEPTIONIST to access receptionist routes", async () => {
      // Sign token as RECEPTIONIST
      const receptionistToken = jwt.sign(
        { userId: "user-receptionist-id", role: "RECEPTIONIST" },
        env.JWT_SECRET
      );

      (prisma.room.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.room.count as jest.Mock).mockResolvedValue(0);

      const res = await request(app)
        .get("/api/rooms")
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
