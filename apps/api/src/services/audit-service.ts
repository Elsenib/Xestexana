import type { FastifyRequest } from "fastify";
import { Prisma, type PrismaClient } from "@prisma/client";

export const AUDIT_CATEGORIES = {
  SECURITY: "SECURITY",
  FINANCE: "FINANCE",
  CLINICAL: "CLINICAL",
  INVENTORY: "INVENTORY",
  APPROVAL: "APPROVAL",
  ADMIN: "ADMIN",
} as const;

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_BLOCKED_INACTIVE: "LOGIN_BLOCKED_INACTIVE",
  STAFF_CREATED: "STAFF_CREATED",
  STAFF_STATUS_CHANGED: "STAFF_STATUS_CHANGED",
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED",
  APPROVAL_APPROVED: "APPROVAL_APPROVED",
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  CASH_SESSION_OPENED: "CASH_SESSION_OPENED",
  CASH_SESSION_CLOSED: "CASH_SESSION_CLOSED",
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
  CHARGE_RECORDED: "CHARGE_RECORDED",
  ENCOUNTER_COMPLETED: "ENCOUNTER_COMPLETED",
  TREATMENT_ITEM_COMPLETED: "TREATMENT_ITEM_COMPLETED",
  COMMISSION_PERIOD_CLOSED: "COMMISSION_PERIOD_CLOSED",
  COMMISSION_PAYOUT_RECORDED: "COMMISSION_PAYOUT_RECORDED",
  REFUND_RECORDED: "REFUND_RECORDED",
  DEPOSIT_RECORDED: "DEPOSIT_RECORDED",
  FILE_UPLOADED: "FILE_UPLOADED",
  FILE_VIEWED: "FILE_VIEWED",
  PERIOD_CLOSED: "PERIOD_CLOSED",
} as const;

type AuditCategory = (typeof AUDIT_CATEGORIES)[keyof typeof AUDIT_CATEGORIES];
type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type Db = PrismaClient | Prisma.TransactionClient;

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "token",
  "setupKey",
]);

export function auditRequestMeta(request: FastifyRequest) {
  return {
    ipAddress: request.ip ?? null,
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
  };
}

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = redactValue(nested);
  }
  return output;
}

export type AuditActor = {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  clinicId?: string | null;
};

export async function recordAudit(
  db: Db,
  input: {
    clinicId?: string | null;
    userId?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    category: AuditCategory;
    action: AuditAction;
    entityType?: string | null;
    entityId?: string | null;
    summary: string;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const details = input.details ? (redactValue(input.details) as Prisma.InputJsonValue) : undefined;

  return db.auditLog.create({
    data: {
      clinicId: input.clinicId ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      userRole: input.userRole ?? null,
      category: input.category,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      summary: input.summary.slice(0, 500),
      details,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
    },
  });
}

export function actorFromRequest(request: FastifyRequest): AuditActor {
  if (!request.user) {
    return {};
  }
  return {
    userId: request.user.sub,
    userEmail: request.user.email,
    userRole: request.user.role,
    clinicId: request.user.clinicId,
  };
}
