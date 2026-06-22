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
  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY || "12345678901234567890123456789012",
  CLIENT_QR_SECRET: process.env.CLIENT_QR_SECRET || "change_me_client_qr_secret",
  WORKER_QR_SECRET: process.env.WORKER_QR_SECRET || "change_me_worker_qr_secret",
  CHECKIN_QR_SECRET: process.env.CHECKIN_QR_SECRET || "change_me_checkin_qr_secret",
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "",
};
