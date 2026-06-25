import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import { fileURLToPath } from "url";
import path from "path";

import { authenticate, authorize, type JwtUserPayload } from "./auth.js";
import { ObservabilityStore } from "./observability/store.js";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { authRoutes } from "./routes/auth.js";
import { doctorRoutes } from "./routes/doctors.js";
import { healthRoutes } from "./routes/health.js";
import { medicalRecordRoutes } from "./routes/medical-records.js";
import { nurseRoutes } from "./routes/nurses.js";
import { observabilityRoutes } from "./routes/observability.js";
import { patientRoutes } from "./routes/patients.js";
import { paymesRoutes } from "./routes/paymes.js";
import { subscriptionRoutes } from "./routes/subscription.js";
import { taskRoutes } from "./routes/tasks.js";
import { clinicalCoreRoutes } from "./routes/clinical-core.js";
import { crmRoutes } from "./routes/crm.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { treatmentPlanRoutes } from "./routes/treatment-plans.js";
import { financeRoutes } from "./routes/finance.js";
import { commissionRoutes } from "./routes/commissions.js";
import { approvalRoutes } from "./routes/approvals.js";
import { auditRoutes } from "./routes/audit.js";
import { patientFileRoutes } from "./routes/patient-files.js";
import { notificationRoutes } from "./routes/notifications.js";
import { warrantyRoutes } from "./routes/warranties.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
    observability: ObservabilityStore;
    authenticate: typeof authenticate;
    authorize: typeof authorize;
  }

  interface FastifyRequest {
    reqStartedAtNs?: bigint;
    user: JwtUserPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}

export function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024
  });

  const observability = new ObservabilityStore();

  app.decorate("prisma", prisma);
  app.decorate("observability", observability);
  app.decorate("authenticate", authenticate);
  app.decorate("authorize", authorize);

  app.addHook('onRequest', (request, reply, done) => {
    (request as any).startTime = Date.now();
    done();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    const durationMs = startTime ? Date.now() - startTime : 0;
    app.observability.recordRequest(durationMs, reply.statusCode);
  });

  app.addHook('onError', async (request, reply, error) => {
    app.observability.recordError({
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      message: error.message,
      stack: error.stack
    });
  });

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET
  });

  app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute"
  });

  app.register(cors, {
    origin: [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      "https://xestexana.live",
      "https://api-production-e6391.up.railway.app",
      "capacitor://localhost",
      "electron://*",
      /^file:\/\/.*/
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  app.register(fastifyStatic, {
    root: path.join(__dirname, '../updates'),
    prefix: '/updates/',
  });

  app.register(authRoutes, { prefix: "/api" });
  app.register(appointmentRoutes, { prefix: "/api" });
  app.register(patientRoutes, { prefix: "/api" });
  app.register(doctorRoutes, { prefix: "/api" });
  app.register(adminUserRoutes, { prefix: "/api" });
  app.register(nurseRoutes, { prefix: "/api" });
  app.register(medicalRecordRoutes, { prefix: "/api" });
  app.register(healthRoutes, { prefix: "/api" });
  app.register(subscriptionRoutes, { prefix: "/api" });
  app.register(paymesRoutes, { prefix: "/api" });
  app.register(taskRoutes, { prefix: "/api" });
  app.register(observabilityRoutes, { prefix: "/api" });
  app.register(clinicalCoreRoutes, { prefix: "/api" });
  app.register(crmRoutes, { prefix: "/api" });
  app.register(dashboardRoutes, { prefix: "/api" });
  app.register(inventoryRoutes, { prefix: "/api" });
  app.register(treatmentPlanRoutes, { prefix: "/api" });
  app.register(approvalRoutes, { prefix: "/api" });
  app.register(financeRoutes, { prefix: "/api" });
  app.register(commissionRoutes, { prefix: "/api" });
  app.register(auditRoutes, { prefix: "/api" });
  app.register(patientFileRoutes, { prefix: "/api" });
  app.register(notificationRoutes, { prefix: "/api" });
  app.register(warrantyRoutes, { prefix: "/api" });

  return app;
}
