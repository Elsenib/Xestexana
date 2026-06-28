import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type NotificationInput = {
  clinicId: string;
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export async function createUserNotification(db: Db, input: NotificationInput) {
  return db.userNotification.create({
    data: {
      clinicId: input.clinicId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 1000),
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}

export async function notifyUsersByRole(
  db: Db,
  input: Omit<NotificationInput, "recipientUserId"> & { roles: string[]; excludeUserId?: string | null },
) {
  const recipients = await db.user.findMany({
    where: {
      clinicId: input.clinicId,
      active: true,
      role: { in: input.roles },
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (!recipients.length) return { count: 0 };
  return db.userNotification.createMany({
    data: recipients.map((recipient) => ({
      clinicId: input.clinicId,
      recipientUserId: recipient.id,
      type: input.type,
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 1000),
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })),
  });
}
