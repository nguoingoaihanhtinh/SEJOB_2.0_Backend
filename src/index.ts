import "tsconfig-paths/register";
import "dotenv/config";

import { createApp } from "./createApp";
import { env } from "./config/env";
import logger from "./utils/logger";
import { createServer } from "http";
import { initSocketServer } from "./websockets/chat.socket";
import { ensureJobsIndex } from "./db/elasticsearch/elasticsearch";

if (env.NODE_ENV === "development") {
  const hasSmtp = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  logger.info(`📧 SMTP config loaded: ${hasSmtp ? "YES" : "NO (email will be mocked)"}`);
}

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.io
initSocketServer(httpServer);

ensureJobsIndex().catch((err) => {
  logger.error("Failed to create ES jobs index:", err.message);
});

httpServer.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});
