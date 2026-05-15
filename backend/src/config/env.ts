import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "default_secret_change_me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
};
