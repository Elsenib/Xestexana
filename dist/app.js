import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { prisma } from "./db.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { healthRoutes } from "./routes/health.js";
export function buildApp() {
    const app = Fastify({
        logger: true,
        trustProxy: true,
        bodyLimit: 1024 * 1024
    });
    app.decorate("prisma", prisma);
    app.register(cors, {
        origin: true,
        credentials: true
    });
    app.register(rateLimit, {
        max: 300,
        timeWindow: "1 minute"
    });
    app.register(healthRoutes, { prefix: "/api" });
    app.register(appointmentRoutes, { prefix: "/api" });
    app.setErrorHandler((error, _request, reply) => {
        app.log.error(error);
        reply.status(500).send({
            message: "Gözlənilməyən server xətası baş verdi."
        });
    });
    return app;
}
