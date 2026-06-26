import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import routes from "./routes";

const app = express();

// --- Middlewares de securite ---

// Helmet : en-tetes HTTP securises
app.use(helmet());

// CORS : accept the Vercel frontend + localhost dev + any extra origin from env
const ALLOWED_ORIGINS = [
  env.FRONTEND_URL,                                    // env var (primary)
  "https://hotel-smart-concierge.vercel.app",          // Vercel production
  "http://localhost:5173",                             // Vite dev server
  "http://localhost:3000",                             // CRA / other dev
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps, Render health checks)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow any *.vercel.app preview deployment
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`CORS policy: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Room-Token", "X-Checkin-Token"],
  })
);


// Rate limiting global : 100 requetes par 15 minutes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de requetes. Veuillez reessayer plus tard.",
  },
});
app.use(limiter);

// --- Middlewares de parsing ---

// JSON body parser
app.use(express.json({ limit: "10mb" }));

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// --- Fichiers statiques (uploads) ---
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// --- Routes ---
app.use("/api", routes);

// --- Gestion globale des erreurs ---
app.use(errorHandler);

export default app;
