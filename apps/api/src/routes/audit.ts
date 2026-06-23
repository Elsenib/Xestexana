import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AUDIT_CATEGORIES } from "../services/audit-service.js";

const auditReaders = ["SUPER_ADMIN", "ADMIN", "MANAGEMENT"] as const;

const listQuerySchema = z.object({
  category: z
    .enum([
      AUDIT_CATEGORIES.SECURITY,
      AUDIT_CATEGORIES.FINANCE,
      AUDIT_CATEGORIES.CLINICAL,
      AUDIT_CATEGORIES.INVENTORY,
      AUDIT_CATEGORIES.APPROVAL,
      AUDIT_CATEGORIES.ADMIN,
    ])
    .optional(),
  action: z.string().trim().min(1).max(80).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export async function auditRoutes(app: FastifyInstance) {
  app.get(
    "/audit/logs",
    { preHandler: [app.authenticate, app.authorize([...auditReaders])] },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId;

      const rows = await app.prisma.auditLog.findMany({
        where: {
          clinicId,
          ...(query.category ? { category: query.category } : {}),
          ...(query.action ? { action: query.action } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: query.take,
      });

      return rows.map((row) => ({
        id: row.id,
        category: row.category,
        action: row.action,
        summary: row.summary,
        entityType: row.entityType,
        entityId: row.entityId,
        userEmail: row.userEmail,
        userRole: row.userRole,
        ipAddress: row.ipAddress,
        details: row.details,
        createdAt: row.createdAt.toISOString(),
      }));
    },
  );
}
