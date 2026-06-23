import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { UserRole } from "@hospital/shared";
import {
  applyEncounterCompletionWithCharges,
  type ChargeLineInput,
} from "./finance-service.js";
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, recordAudit } from "./audit-service.js";

export const APPROVAL_ACTIONS = {
  STOCK_MOVEMENT: "STOCK_MOVEMENT",
  CLINICAL_ENCOUNTER_COMPLETE: "CLINICAL_ENCOUNTER_COMPLETE",
  SERVICE_UPSERT: "SERVICE_UPSERT",
} as const;

export type ApprovalActionType = (typeof APPROVAL_ACTIONS)[keyof typeof APPROVAL_ACTIONS];

const STOCK_INCOMING = new Set(["PURCHASE", "TRANSFER_IN", "RETURN", "ADJUSTMENT_IN"]);

export const stockMovementPayloadSchema = z.object({
  productId: z.string().min(1),
  type: z.enum([
    "PURCHASE",
    "CONSUMPTION",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "RETURN",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "WRITE_OFF",
  ]),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(3).max(500),
  reference: z.string().max(120).nullable().optional(),
});

const serviceUpsertPayloadSchema = z.object({
  mode: z.enum(["create", "update"]),
  serviceId: z.string().optional(),
  data: z.record(z.unknown()),
});

const encounterCompletePayloadSchema = z.object({
  encounterId: z.string().min(1),
  charges: z
    .array(
      z.object({
        serviceId: z.string().min(1).optional(),
        amount: z.coerce.number().positive().optional(),
        quantity: z.coerce.number().positive().default(1),
        description: z.string().min(2).max(500),
      }),
    )
    .max(20)
    .optional(),
});

function signedStock(type: string, quantity: Prisma.Decimal) {
  return (STOCK_INCOMING.has(type) ? 1 : -1) * quantity.toNumber();
}

export function resolveReviewer(
  requesterRole: UserRole,
  actionType: ApprovalActionType,
  options?: { supervisingDoctorUserId?: string },
): { reviewerRole: UserRole; reviewerUserId: string | null } {
  if (actionType === APPROVAL_ACTIONS.STOCK_MOVEMENT) {
    if (requesterRole === "NURSE") {
      return { reviewerRole: "DOCTOR", reviewerUserId: options?.supervisingDoctorUserId ?? null };
    }
    return { reviewerRole: "SUPER_ADMIN", reviewerUserId: null };
  }

  if (actionType === APPROVAL_ACTIONS.CLINICAL_ENCOUNTER_COMPLETE) {
    return {
      reviewerRole: "DOCTOR",
      reviewerUserId: options?.supervisingDoctorUserId ?? null,
    };
  }

  if (actionType === APPROVAL_ACTIONS.SERVICE_UPSERT) {
    return { reviewerRole: "SUPER_ADMIN", reviewerUserId: null };
  }

  return { reviewerRole: "SUPER_ADMIN", reviewerUserId: null };
}

export function shouldAutoApply(requesterRole: UserRole) {
  return requesterRole === "SUPER_ADMIN";
}

export function needsApproval(requesterRole: UserRole, actionType: ApprovalActionType) {
  if (requesterRole === "SUPER_ADMIN") return false;
  if (actionType === APPROVAL_ACTIONS.CLINICAL_ENCOUNTER_COMPLETE) {
    return requesterRole === "NURSE";
  }
  return true;
}

export function canUserReview(
  user: { sub?: string; role: UserRole },
  approval: { reviewerRole: string; reviewerUserId: string | null },
) {
  if (user.role === "SUPER_ADMIN") return true;
  if (approval.reviewerUserId) return approval.reviewerUserId === user.sub;
  return approval.reviewerRole === user.role;
}

export function reviewQueueWhere(
  clinicId: string,
  user: { sub?: string; role: UserRole },
  status: "PENDING" | "APPROVED" | "REJECTED",
): Prisma.ApprovalRequestWhereInput {
  if (user.role === "SUPER_ADMIN") {
    return { clinicId, status };
  }

  return {
    clinicId,
    status,
    OR: [
      { reviewerUserId: user.sub ?? "__none__" },
      { reviewerUserId: null, reviewerRole: user.role },
    ],
  };
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export async function applyApprovedAction(
  tx: Tx,
  approval: {
    actionType: string;
    payload: Prisma.JsonValue;
    requestedByUserId: string;
    clinicId: string;
    entityId: string | null;
  },
): Promise<{ error?: "ENTITY_NOT_FOUND" | "INSUFFICIENT" | "UNSUPPORTED"; balance?: number }> {
  if (approval.actionType === APPROVAL_ACTIONS.STOCK_MOVEMENT) {
    const movement = stockMovementPayloadSchema.parse(approval.payload);
    const product = await tx.product.findFirst({
      where: { id: movement.productId, clinicId: approval.clinicId, active: true },
    });
    if (!product) return { error: "ENTITY_NOT_FOUND" };

    const rows = await tx.stockMovement.findMany({
      where: { clinicId: approval.clinicId, productId: product.id },
      select: { type: true, quantity: true },
    });
    const balance = rows.reduce((sum, row) => sum + signedStock(row.type, row.quantity), 0);
    if (!STOCK_INCOMING.has(movement.type) && balance < movement.quantity) {
      return { error: "INSUFFICIENT", balance };
    }

    await tx.stockMovement.create({
      data: {
        clinicId: approval.clinicId,
        productId: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference,
        createdByUserId: approval.requestedByUserId,
      },
    });
    return {};
  }

  if (approval.actionType === APPROVAL_ACTIONS.CLINICAL_ENCOUNTER_COMPLETE) {
    const encounterId = approval.entityId;
    if (!encounterId) return { error: "ENTITY_NOT_FOUND" as const };

    const payload = encounterCompletePayloadSchema.parse(approval.payload);
    const result = await applyEncounterCompletionWithCharges(tx, {
      clinicId: approval.clinicId,
      encounterId,
      createdByUserId: approval.requestedByUserId,
      charges: payload.charges as ChargeLineInput[] | undefined,
    });
    if (result.error) return { error: result.error };
    return {};
  }

  if (approval.actionType === APPROVAL_ACTIONS.SERVICE_UPSERT) {
    const payload = serviceUpsertPayloadSchema.parse(approval.payload);

    if (payload.mode === "create") {
      const data = payload.data as {
        code: string;
        name: string;
        category: string;
        price: number;
        durationMinutes?: number;
        active?: boolean;
      };
      await tx.service.create({
        data: {
          code: data.code,
          name: data.name,
          category: data.category,
          price: data.price,
          durationMinutes: data.durationMinutes ?? 30,
          active: data.active ?? true,
          clinic: { connect: { id: approval.clinicId } },
        },
      });
      return {};
    }

    if (payload.mode === "update" && payload.serviceId) {
      const existing = await tx.service.findFirst({
        where: { id: payload.serviceId, clinicId: approval.clinicId },
      });
      if (!existing) return { error: "ENTITY_NOT_FOUND" };
      await tx.service.update({
        where: { id: payload.serviceId },
        data: payload.data as Prisma.ServiceUpdateInput,
      });
      return {};
    }

    return { error: "UNSUPPORTED" };
  }

  return { error: "UNSUPPORTED" };
}

export async function createApprovalRequest(
  prisma: PrismaClient,
  input: {
    clinicId: string;
    requestedByUserId: string;
    requesterRole: UserRole;
    actionType: ApprovalActionType;
    entityType: string;
    entityId?: string | null;
    payload: Prisma.InputJsonValue;
    supervisingDoctorUserId?: string;
  },
) {
  const reviewer = resolveReviewer(input.requesterRole, input.actionType, {
    supervisingDoctorUserId: input.supervisingDoctorUserId,
  });

  return prisma.$transaction(async (tx) => {
    const approval = await tx.approvalRequest.create({
      data: {
        clinicId: input.clinicId,
        requestedByUserId: input.requestedByUserId,
        reviewerRole: reviewer.reviewerRole,
        reviewerUserId: reviewer.reviewerUserId,
        actionType: input.actionType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        payload: input.payload,
      },
    });

    const requester = await tx.user.findUnique({
      where: { id: input.requestedByUserId },
      select: { email: true },
    });

    await recordAudit(tx, {
      clinicId: input.clinicId,
      userId: input.requestedByUserId,
      userEmail: requester?.email ?? null,
      userRole: input.requesterRole,
      category: AUDIT_CATEGORIES.APPROVAL,
      action: AUDIT_ACTIONS.APPROVAL_REQUESTED,
      entityType: "ApprovalRequest",
      entityId: approval.id,
      summary: `Təsdiq sorğusu yaradıldı: ${input.actionType}`,
      details: {
        actionType: input.actionType,
        targetEntityType: input.entityType,
        targetEntityId: input.entityId ?? null,
        reviewerRole: reviewer.reviewerRole,
      },
    });

    return approval;
  });
}

export function approvalStatusMessage(reviewerRole: string, reviewerUserId: string | null) {
  if (reviewerUserId) return "Məsul həkimin təsdiqi gözlənilir.";
  if (reviewerRole === "SUPER_ADMIN") return "Super Admin təsdiqi gözlənilir.";
  if (reviewerRole === "DOCTOR") return "Həkim təsdiqi gözlənilir.";
  return "Rəhbər təsdiqi gözlənilir.";
}
