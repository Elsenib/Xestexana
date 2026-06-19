import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "işlək",
    timestamp: new Date().toISOString()
  }));
}