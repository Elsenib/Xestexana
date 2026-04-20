import "dotenv/config";

import { buildApp } from "./app.js";
import { prisma } from "./db.js";
import { env } from "./env.js";

const app = buildApp();

async function start() {
  try {
    await prisma.$connect();
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  app.log.info({ signal }, "server bağlanır");
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();