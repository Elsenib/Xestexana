import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const inventoryRoles = ["ADMIN", "INVENTORY_MANAGER", "NURSE"] as const;
const managerRoles = ["ADMIN", "INVENTORY_MANAGER"] as const;
const movementTypes = [
  "PURCHASE",
  "CONSUMPTION",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "WRITE_OFF",
] as const;
const incoming = new Set(["PURCHASE", "TRANSFER_IN", "RETURN", "ADJUSTMENT_IN"]);

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  sku: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  unit: z.string().trim().min(1).max(30),
  minimumStock: z.coerce.number().min(0).max(999999999),
  location: z.string().trim().max(120).nullable().optional(),
});
const productPatchSchema = productSchema.partial().extend({ active: z.boolean().optional() });
const movementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(movementTypes),
  quantity: z.coerce.number().positive().max(999999999),
  reason: z.string().trim().min(3).max(500),
  reference: z.string().trim().max(120).nullable().optional(),
});
const idParams = z.object({ id: z.string().min(1) });

function signedQuantity(type: string, quantity: Prisma.Decimal) {
  return incoming.has(type) ? quantity.toNumber() : -quantity.toNumber();
}

export async function inventoryRoutes(app: FastifyInstance) {
  app.get(
    "/inventory/products",
    { preHandler: [app.authenticate, app.authorize([...inventoryRoles])] },
    async (request) => {
      const products = await app.prisma.product.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      });
      const productIds = products.map((product) => product.id);
      const [totals, recentMovements] = await Promise.all([
        app.prisma.stockMovement.groupBy({
          by: ["productId", "type"],
          where: { clinicId: request.user.clinicId, productId: { in: productIds } },
          _sum: { quantity: true },
        }),
        app.prisma.stockMovement.findMany({
          where: { clinicId: request.user.clinicId, productId: { in: productIds } },
          orderBy: { createdAt: "desc" },
          take: 200,
          include: { createdBy: { select: { email: true, role: true } } },
        }),
      ]);
      return products.map((product) => {
        const balance = totals.filter((row) => row.productId === product.id).reduce(
          (sum, row) => sum + signedQuantity(row.type, row._sum.quantity ?? new Prisma.Decimal(0)),
          0,
        );
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          sku: product.sku,
          unit: product.unit,
          minimumStock: product.minimumStock.toNumber(),
          location: product.location,
          active: product.active,
          balance,
          isCritical: product.active && balance <= product.minimumStock.toNumber(),
          recentMovements: recentMovements.filter((movement) => movement.productId === product.id).slice(0, 20).map((movement) => ({
            id: movement.id,
            type: movement.type,
            quantity: movement.quantity.toNumber(),
            reason: movement.reason,
            reference: movement.reference,
            createdAt: movement.createdAt,
            createdBy: movement.createdBy,
          })),
        };
      });
    },
  );

  app.post(
    "/inventory/products",
    { preHandler: [app.authenticate, app.authorize([...managerRoles])] },
    async (request, reply) => {
      const body = productSchema.parse(request.body);
      try {
        const product = await app.prisma.product.create({
          data: { ...body, clinicId: request.user.clinicId },
        });
        return reply.code(201).send({ ...product, minimumStock: product.minimumStock.toNumber() });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return reply.code(409).send({ message: "Bu SKU ilə məhsul artıq mövcuddur." });
        }
        throw error;
      }
    },
  );

  app.patch(
    "/inventory/products/:id",
    { preHandler: [app.authenticate, app.authorize([...managerRoles])] },
    async (request, reply) => {
      const { id } = idParams.parse(request.params);
      const body = productPatchSchema.parse(request.body);
      const product = await app.prisma.product.findFirst({
        where: { id, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!product) return reply.code(404).send({ message: "Məhsul tapılmadı." });
      const updated = await app.prisma.product.update({ where: { id }, data: body });
      return { ...updated, minimumStock: updated.minimumStock.toNumber() };
    },
  );

  app.post(
    "/inventory/movements",
    { preHandler: [app.authenticate, app.authorize([...inventoryRoles])] },
    async (request, reply) => {
      const body = movementSchema.parse(request.body);
      const userId = request.user.sub;
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });
      if (request.user.role === "NURSE" && !["CONSUMPTION", "RETURN"].includes(body.type)) {
        return reply.code(403).send({ message: "Assistent yalnız material sərfi və geri qaytarmanı qeyd edə bilər." });
      }

      try {
        const result = await app.prisma.$transaction(async (tx) => {
          const product = await tx.product.findFirst({
            where: { id: body.productId, clinicId: request.user.clinicId, active: true },
          });
          if (!product) return { error: "NOT_FOUND" as const };
          const movements = await tx.stockMovement.findMany({
            where: { productId: product.id, clinicId: request.user.clinicId },
            select: { type: true, quantity: true },
          });
          const balance = movements.reduce(
            (sum, movement) => sum + signedQuantity(movement.type, movement.quantity),
            0,
          );
          if (!incoming.has(body.type) && balance < body.quantity) {
            return { error: "INSUFFICIENT" as const, balance };
          }
          const movement = await tx.stockMovement.create({
            data: {
              clinicId: request.user.clinicId,
              productId: product.id,
              type: body.type,
              quantity: body.quantity,
              reason: body.reason,
              reference: body.reference,
              createdByUserId: userId,
            },
          });
          return {
            movement: { ...movement, quantity: movement.quantity.toNumber() },
            balance: balance + (incoming.has(body.type) ? body.quantity : -body.quantity),
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        if ("error" in result && result.error === "NOT_FOUND") {
          return reply.code(404).send({ message: "Aktiv məhsul tapılmadı." });
        }
        if ("error" in result && result.error === "INSUFFICIENT") {
          return reply.code(409).send({ message: `Kifayət qədər stok yoxdur. Cari qalıq: ${result.balance}.` });
        }
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          return reply.code(409).send({ message: "Stok eyni anda dəyişdi. Yenidən yoxlayın." });
        }
        throw error;
      }
    },
  );
}
