import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  applyApprovedAction,
  canUserReview,
  reviewQueueWhere,
} from "../services/approval-service.js";

const staffRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "CALL_CENTER",
  "DOCTOR",
  "NURSE",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
] as const;

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  scope: z.enum(["review", "mine", "all"]).default("review"),
});
const paramsSchema = z.object({ id: z.string().min(1) });
const reviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(1000).nullable().optional(),
});

const approvalInclude = {
  requestedBy: { select: { email: true, role: true } },
  reviewedBy: { select: { email: true, role: true } },
  reviewerUser: { select: { email: true, role: true } },
} as const;

export async function approvalRoutes(app: FastifyInstance) {
  app.get(
    "/approvals/summary",
    { preHandler: [app.authenticate, app.authorize([...staffRoles])] },
    async (request) => {
      const clinicId = request.user.clinicId;
      const user = request.user;

      const [pendingForReview, myPending] = await Promise.all([
        app.prisma.approvalRequest.count({
          where: reviewQueueWhere(clinicId, user, "PENDING"),
        }),
        app.prisma.approvalRequest.count({
          where: { clinicId, requestedByUserId: user.sub!, status: "PENDING" },
        }),
      ]);

      return { pendingForReview, myPending };
    },
  );

  app.get(
    "/approvals",
    { preHandler: [app.authenticate, app.authorize([...staffRoles])] },
    async (request) => {
      const query = querySchema.parse(request.query);
      const clinicId = request.user.clinicId;
      const user = request.user;

      const where =
        query.scope === "mine"
          ? {
              clinicId,
              requestedByUserId: user.sub!,
              status: query.status,
            }
          : query.scope === "all" && user.role === "SUPER_ADMIN"
            ? { clinicId, status: query.status }
            : reviewQueueWhere(clinicId, user, query.status);

      return app.prisma.approvalRequest.findMany({
        where,
        include: approvalInclude,
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    },
  );

  app.patch(
    "/approvals/:id/review",
    { preHandler: [app.authenticate, app.authorize([...staffRoles])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const body = reviewSchema.parse(request.body);
      const reviewerId = request.user.sub!;

      try {
        const result = await app.prisma.$transaction(
          async (tx) => {
            const approval = await tx.approvalRequest.findFirst({
              where: { id, clinicId: request.user.clinicId },
            });
            if (!approval) return { error: "NOT_FOUND" as const };
            if (approval.status !== "PENDING") return { error: "REVIEWED" as const };
            if (!canUserReview(request.user, approval)) {
              return { error: "FORBIDDEN" as const };
            }

            if (body.decision === "REJECT") {
              return tx.approvalRequest.update({
                where: { id },
                data: {
                  status: "REJECTED",
                  reviewNote: body.note,
                  reviewedByUserId: reviewerId,
                  reviewedAt: new Date(),
                },
                include: approvalInclude,
              });
            }

            const applied = await applyApprovedAction(tx, approval);
            if (applied.error === "ENTITY_NOT_FOUND") return { error: "ENTITY_NOT_FOUND" as const };
            if (applied.error === "INSUFFICIENT") {
              return { error: "INSUFFICIENT" as const, balance: applied.balance };
            }
            if (applied.error === "UNSUPPORTED") return { error: "UNSUPPORTED" as const };

            return tx.approvalRequest.update({
              where: { id },
              data: {
                status: "APPROVED",
                reviewNote: body.note,
                reviewedByUserId: reviewerId,
                reviewedAt: new Date(),
                appliedAt: new Date(),
              },
              include: approvalInclude,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if ("error" in result) {
          const codes = {
            NOT_FOUND: 404,
            REVIEWED: 409,
            FORBIDDEN: 403,
            ENTITY_NOT_FOUND: 404,
            INSUFFICIENT: 409,
            UNSUPPORTED: 400,
          } as const;
          const messages = {
            NOT_FOUND: "Təsdiq sorğusu tapılmadı.",
            REVIEWED: "Sorğu artıq cavablandırılıb.",
            FORBIDDEN: "Bu sorğunu təsdiqləmək səlahiyyətiniz yoxdur.",
            ENTITY_NOT_FOUND: "Əlaqəli məlumat tapılmadı.",
            INSUFFICIENT: `Kifayət qədər stok yoxdur.${"balance" in result ? ` Cari qalıq: ${result.balance}.` : ""}`,
            UNSUPPORTED: "Bu əməliyyat növü dəstəklənmir və ya artıq tətbiq olunub.",
          } as const;
          return reply.code(codes[result.error]).send({ message: messages[result.error] });
        }

        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          return reply.code(409).send({ message: "Məlumat eyni anda dəyişdi. Yenidən yoxlayın." });
        }
        throw error;
      }
    },
  );
}
