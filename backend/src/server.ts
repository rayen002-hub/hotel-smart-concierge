import http from "http";
import app from "./app";
import { env } from "./config/env";
import { initSocketIO } from "./socket/socket";

const start = async () => {
  try {
    // Creer un serveur HTTP a partir de l'app Express
    const server = http.createServer(app);

    // Initialiser Socket.IO sur le meme serveur
    initSocketIO(server);

    server.listen(env.PORT, () => {
      console.log(`========================================`);
      console.log(`  Backend running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  Frontend URL: ${env.FRONTEND_URL}`);
      console.log(`  AI Service URL: ${env.AI_SERVICE_URL}`);
      console.log(`  Socket.IO: enabled`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error);
    process.exit(1);
  }
};

start();
