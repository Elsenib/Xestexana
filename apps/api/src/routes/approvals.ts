import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  applyApprovedAction,
  canUserReview,
  reviewQueueWhere,
} from "../services/approval-service.js";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  actorFromRequest,
  auditRequestMeta,
  recordAudit,
} from "../services/audit-service.js";
import { createUserNotification } from "../services/user-notification-service.js";

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
              const rejected = await tx.approvalRequest.update({
                where: { id },
                data: {
                  status: "REJECTED",
                  reviewNote: body.note,
                  reviewedByUserId: reviewerId,
                  reviewedAt: new Date(),
                },
                include: approvalInclude,
              });
              await createUserNotification(tx, {
                clinicId: approval.clinicId,
                recipientUserId: approval.requestedByUserId,
                type: "APPROVAL_REVIEWED",
                title: "Təsdiq sorğusu cavablandırıldı",
                message: `${approval.actionType} · rədd edildi`,
                href: "/approvals",
                entityType: "ApprovalRequest",
                entityId: approval.id,
              });
              return { kind: "rejected" as const, approval: rejected };
            }

            const applied = await applyApprovedAction(tx, approval);
            if (applied.error === "ENTITY_NOT_FOUND") return { error: "ENTITY_NOT_FOUND" as const };
            if (applied.error === "INSUFFICIENT") {
              return { error: "INSUFFICIENT" as const, balance: applied.balance };
            }
            if (applied.error === "UNSUPPORTED") return { error: "UNSUPPORTED" as const };
            if (applied.error === "CASH_SESSION_REQUIRED") return { error: "CASH_SESSION_REQUIRED" as const };
            if (applied.error === "REFUND_EXCEEDS_PAYMENT") return { error: "REFUND_EXCEEDS_PAYMENT" as const };

            const approved = await tx.approvalRequest.update({
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
            await createUserNotification(tx, {
              clinicId: approval.clinicId,
              recipientUserId: approval.requestedByUserId,
              type: "APPROVAL_REVIEWED",
              title: "Təsdiq sorğusu cavablandırıldı",
              message: `${approval.actionType} · təsdiq edildi`,
              href: "/approvals",
              entityType: "ApprovalRequest",
              entityId: approval.id,
            });
            return { kind: "approved" as const, approval: approved };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if ("error" in result) {
          const err = result.error;
          if (err === "NOT_FOUND") {
            return reply.code(404).send({ message: "Təsdiq sorğusu tapılmadı." });
          }
          if (err === "REVIEWED") {
            return reply.code(409).send({ message: "Sorğu artıq cavablandırılıb." });
          }
          if (err === "FORBIDDEN") {
            return reply.code(403).send({ message: "Bu sorğunu təsdiqləmək səlahiyyətiniz yoxdur." });
          }
          if (err === "ENTITY_NOT_FOUND") {
            return reply.code(404).send({ message: "Əlaqəli məlumat tapılmadı." });
          }
          if (err === "INSUFFICIENT") {
            const suffix = "balance" in result ? ` Cari qalıq: ${result.balance}.` : "";
            return reply.code(409).send({ message: `Kifayət qədər stok yoxdur.${suffix}` });
          }
          if (err === "UNSUPPORTED") {
            return reply.code(400).send({ message: "Bu əməliyyat növü dəstəklənmir və ya artıq tətbiq olunub." });
          }
          if (err === "CASH_SESSION_REQUIRED") {
            return reply.code(409).send({ message: "Nağd refund təsdiqlənməzdən əvvəl kassa növbəsi açılmalıdır." });
          }
          if (err === "REFUND_EXCEEDS_PAYMENT") {
            return reply.code(409).send({ message: "Refund məbləği qəbzin qalan məbləğindən çoxdur." });
          }
          return reply.code(400).send({ message: "Sorğu rədd edildi." });
        }

        const actor = actorFromRequest(request);
        const meta = auditRequestMeta(request);
        const approval = result.approval;

        await recordAudit(app.prisma, {
          ...actor,
          category: AUDIT_CATEGORIES.APPROVAL,
          action:
            result.kind === "approved" ? AUDIT_ACTIONS.APPROVAL_APPROVED : AUDIT_ACTIONS.APPROVAL_REJECTED,
          entityType: "ApprovalRequest",
          entityId: approval.id,
          summary:
            result.kind === "approved"
              ? `Təsdiq edildi: ${approval.actionType}`
              : `Rədd edildi: ${approval.actionType}`,
          details: {
            actionType: approval.actionType,
            entityType: approval.entityType,
            entityId: approval.entityId,
            reviewNote: body.note ?? null,
          },
          ...meta,
        });

        return approval;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          return reply.code(409).send({ message: "Məlumat eyni anda dəyişdi. Yenidən yoxlayın." });
        }
        throw error;
      }
    },
  );
}
