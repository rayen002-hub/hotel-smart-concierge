import app from "./app";
import { env } from "./config/env";

const start = async () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`========================================`);
      console.log(`  Backend running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  Frontend URL: ${env.FRONTEND_URL}`);
      console.log(`  AI Service URL: ${env.AI_SERVICE_URL}`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error);
    process.exit(1);
  }
};

start();
