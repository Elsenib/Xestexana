import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { authenticate, authorize } from "./auth.js";
import { ObservabilityStore } from "./observability/store.js";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { authRoutes } from "./routes/auth.js";
import { doctorRoutes } from "./routes/doctors.js";
import { healthRoutes } from "./routes/health.js";
import { medicalRecordRoutes } from "./routes/medical-records.js";
import { observabilityRoutes } from "./routes/observability.js";
import { patientRoutes } from "./routes/patients.js";
export function buildApp() {
    const app = Fastify({
        logger: true,
        trustProxy: true,
        bodyLimit: 1024 * 1024
    });
    const observability = new ObservabilityStore();
    app.decorate("prisma", prisma);
    app.decorate("observability", observability);
    app.decorate("authenticate", authenticate);
    app.decorate("authorize", authorize);
    app.register(fastifyJwt, {
        secret: env.JWT_SECRET
    });
    app.register(cors, {
        origin: true,
        credentials: true
    });
    app.register(rateLimit, {
        max: 300,
        timeWindow: "1 minute"
    });
    app.addHook("onRequest", async (request) => {
        request.reqStartedAtNs = process.hrtime.bigint();
    });
    app.addHook("onResponse", async (request, reply) => {
        if (!request.reqStartedAtNs) {
            return;
        }
        const diffNs = process.hrtime.bigint() - request.reqStartedAtNs;
        const durationMs = Number(diffNs) / 1_000_000;
        observability.recordRequest(durationMs, reply.statusCode);
        const routePath = request.routeOptions.url ?? request.raw.url ?? "unknown";
        const logPayload = {
            reqId: request.id,
            method: request.method,
            path: routePath,
            statusCode: reply.statusCode,
            responseTimeMs: Number(durationMs.toFixed(2))
        };
        if (durationMs >= 1000) {
            app.log.warn(logPayload, "yavaş sorğu aşkarlandı");
        }
        else {
            app.log.info(logPayload, "sorğu tamamlandı");
        }
    });
    app.register(healthRoutes, { prefix: "/api" });
    app.register(authRoutes, { prefix: "/api" });
    app.register(adminUserRoutes, { prefix: "/api" });
    app.register(patientRoutes, { prefix: "/api" });
    app.register(doctorRoutes, { prefix: "/api" });
    app.register(appointmentRoutes, { prefix: "/api" });
    app.register(medicalRecordRoutes, { prefix: "/api" });
    app.register(observabilityRoutes, { prefix: "/api" });
    app.setErrorHandler((error, request, reply) => {
        const routePath = request.routeOptions.url ?? request.raw.url ?? "unknown";
        const statusCode = typeof error.statusCode === "number"
            ? error.statusCode
            : 500;
        const safeError = error instanceof Error ? error : new Error("Naməlum server xətası");
        observability.recordError({
            method: request.method,
            path: routePath,
            statusCode,
            message: safeError.message,
            stack: safeError.stack
        });
        app.log.error(safeError);
        reply.status(500).send({
            message: "Gözlənilməyən server xətası baş verdi."
        });
    });
    return app;
}
