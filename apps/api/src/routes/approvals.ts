import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const staffRoles = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT"] as const;
const incoming = new Set(["PURCHASE", "TRANSFER_IN", "RETURN", "ADJUSTMENT_IN"]);
const movementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["PURCHASE", "CONSUMPTION", "TRANSFER_IN", "TRANSFER_OUT", "RETURN", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "WRITE_OFF"]),
  quantity: z.coerce.number().positive(), reason: z.string().min(3).max(500), reference: z.string().max(120).nullable().optional(),
});
const querySchema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"), mine: z.coerce.boolean().default(false) });
const paramsSchema = z.object({ id: z.string().min(1) });
const reviewSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().trim().max(1000).nullable().optional() });
const signed = (type: string, quantity: Prisma.Decimal) => (incoming.has(type) ? 1 : -1) * quantity.toNumber();

export async function approvalRoutes(app: FastifyInstance) {
  app.get("/approvals", { preHandler: [app.authenticate, app.authorize([...staffRoles])] }, async (request) => {
    const query = querySchema.parse(request.query);
    return app.prisma.approvalRequest.findMany({
      where: {
        clinicId: request.user.clinicId, status: query.status,
        ...(query.mine ? { requestedByUserId: request.user.sub } : request.user.role === "SUPER_ADMIN" ? { reviewerRole: "SUPER_ADMIN" } : { reviewerRole: request.user.role }),
      },
      include: { requestedBy: { select: { email: true, role: true } }, reviewedBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" }, take: 200,
    });
  });

  app.patch("/approvals/:id/review", { preHandler: [app.authenticate, app.authorize([...staffRoles])] }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params); const body = reviewSchema.parse(request.body); const reviewerId = request.user.sub!;
    try {
      const result = await app.prisma.$transaction(async (tx) => {
        const approval = await tx.approvalRequest.findFirst({ where: { id, clinicId: request.user.clinicId } });
        if (!approval) return { error: "NOT_FOUND" as const };
        if (approval.status !== "PENDING") return { error: "REVIEWED" as const };
        if (request.user.role !== "SUPER_ADMIN" && approval.reviewerRole !== request.user.role) return { error: "FORBIDDEN" as const };
        if (body.decision === "REJECT") {
          return tx.approvalRequest.update({ where: { id }, data: { status: "REJECTED", reviewNote: body.note, reviewedByUserId: reviewerId, reviewedAt: new Date() } });
        }
        if (approval.actionType === "STOCK_MOVEMENT") {
          const movement = movementSchema.parse(approval.payload);
          const product = await tx.product.findFirst({ where: { id: movement.productId, clinicId: request.user.clinicId, active: true } });
          if (!product) return { error: "ENTITY_NOT_FOUND" as const };
          const rows = await tx.stockMovement.findMany({ where: { clinicId: request.user.clinicId, productId: product.id }, select: { type: true, quantity: true } });
          const balance = rows.reduce((sum, row) => sum + signed(row.type, row.quantity), 0);
          if (!incoming.has(movement.type) && balance < movement.quantity) return { error: "INSUFFICIENT" as const, balance };
          await tx.stockMovement.create({ data: { clinicId: request.user.clinicId, productId: movement.productId, type: movement.type, quantity: movement.quantity, reason: movement.reason, reference: movement.reference, createdByUserId: approval.requestedByUserId } });
        } else return { error: "UNSUPPORTED" as const };
        return tx.approvalRequest.update({ where: { id }, data: { status: "APPROVED", reviewNote: body.note, reviewedByUserId: reviewerId, reviewedAt: new Date(), appliedAt: new Date() } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if ("error" in result) {
        const codes = { NOT_FOUND: 404, REVIEWED: 409, FORBIDDEN: 403, ENTITY_NOT_FOUND: 404, INSUFFICIENT: 409, UNSUPPORTED: 400 } as const;
        const messages = { NOT_FOUND: "Təsdiq sorğusu tapılmadı.", REVIEWED: "Sorğu artıq cavablandırılıb.", FORBIDDEN: "Bu sorğunu təsdiqləmək səlahiyyətiniz yoxdur.", ENTITY_NOT_FOUND: "Əlaqəli məlumat tapılmadı.", INSUFFICIENT: "Kifayət qədər stok yoxdur.", UNSUPPORTED: "Bu əməliyyat növü dəstəklənmir." } as const;
        return reply.code(codes[result.error]).send({ message: messages[result.error] });
      }
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return reply.code(409).send({ message: "Məlumat eyni anda dəyişdi. Yenidən yoxlayın." });
      throw error;
    }
  });
}
