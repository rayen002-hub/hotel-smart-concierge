import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import routes from "./routes";

const app = express();

// --- Middlewares de securite ---

// Helmet : en-tetes HTTP securises
app.use(helmet());

// CORS : configurable via FRONTEND_URL
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

// --- Routes ---
app.use("/api", routes);

// --- Gestion globale des erreurs ---
app.use(errorHandler);

export default app;
