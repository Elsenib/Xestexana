import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { env } from "../env.js";

const createClinicWithSubscriptionSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic"),
  setupKey: z.string().min(16)
});

const updateSubscriptionSchema = z.object({
  clinicId: z.string(),
  subscriptionPlan: z.string(),
  subscriptionStatus: z.enum(["trial", "active", "expired", "cancelled"]),
  subscriptionEnd: z.string().datetime().optional(),
  setupKey: z.string().min(16)
});

const subscriptionPlans = {
  basic: {
    nameKey: "subscription.basic.name",
    price: 100, // AZN/ay
    maxUsers: 5,
    maxPatients: 100,
    features: [
      "subscription.basic.feature1",
      "subscription.basic.feature2",
      "subscription.basic.feature3"
    ]
  },
  professional: {
    nameKey: "subscription.professional.name",
    price: 200, // AZN/ay
    maxUsers: 15,
    maxPatients: 500,
    features: [
      "subscription.professional.feature1",
      "subscription.professional.feature2",
      "subscription.professional.feature3",
      "subscription.professional.feature4"
    ]
  },
  enterprise: {
    nameKey: "subscription.enterprise.name",
    price: 500, // AZN/ay
    maxUsers: 50,
    maxPatients: 2000,
    features: [
      "subscription.enterprise.feature1",
      "subscription.enterprise.feature2",
      "subscription.enterprise.feature3",
      "subscription.enterprise.feature4"
    ]
  }
};

export async function subscriptionRoutes(app: FastifyInstance) {
  // Klinik oluşturma + Admin hesabı + Abonelik başlatma
  app.post("/subscription/create-clinic", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const body = createClinicWithSubscriptionSchema.parse(request.body);

    if (body.setupKey !== env.ADMIN_SETUP_KEY) {
      return reply.code(403).send({ message: "Qurulum açarı yanlışdır." });
    }

    const plan = subscriptionPlans[body.subscriptionPlan];
    const passwordHash = await bcrypt.hash(body.adminPassword, 10);

    const clinic = await app.prisma.$transaction(async (tx) => {
      const createdClinic = await tx.clinic.create({
        data: {
          name: body.name,
          address: body.address,
          phone: body.phone,
          logo: body.logo,
          subscriptionPlan: body.subscriptionPlan,
          subscriptionStatus: "trial",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maxUsers: plan.maxUsers,
          maxPatients: plan.maxPatients
        }
      });

      await tx.user.create({
        data: {
          email: body.adminEmail,
          passwordHash,
          role: "ADMIN",
          clinicId: createdClinic.id
        }
      });

      return createdClinic;
    });

    return reply.code(201).send({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        subscriptionPlan: clinic.subscriptionPlan,
        subscriptionStatus: clinic.subscriptionStatus,
        subscriptionEnd: clinic.subscriptionEnd?.toISOString(),
        maxUsers: clinic.maxUsers,
        maxPatients: clinic.maxPatients
      },
      admin: {
        email: body.adminEmail,
        role: "ADMIN"
      },
      plan: {
        ...plan,
        trialEnds: clinic.subscriptionEnd?.toISOString()
      }
    });
  });

  // Abonelik planlarını listele
  app.get("/subscription/plans", async (request, reply) => {
    return reply.send(subscriptionPlans);
  });

  // Klinik abonelik bilgilerini getir
  app.get("/subscription/clinic/:clinicId", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { clinicId } = request.params as { clinicId: string };

    // Sadece kendi klinik bilgilerini görebilir
    if (request.user.clinicId !== clinicId) {
      return reply.code(403).send({ message: "Bu işlem için yetkiniz yok." });
    }

    const clinic = await app.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        maxUsers: true,
        maxPatients: true,
        _count: {
          select: {
            users: true,
            patients: true
          }
        }
      }
    });

    if (!clinic) {
      return reply.code(404).send({ message: "Klinik bulunamadı." });
    }

    const plan = subscriptionPlans[(clinic.subscriptionPlan || "basic") as keyof typeof subscriptionPlans];

    return reply.send({
      clinic,
      plan,
      usage: {
        currentUsers: clinic._count.users,
        currentPatients: clinic._count.patients,
        userLimit: clinic.maxUsers,
        patientLimit: clinic.maxPatients
      }
    });
  });

  // Abonelik güncelle (sadece süper admin için)
  app.patch("/subscription/update", {
    preHandler: [app.authenticate, app.authorize(["ADMIN"])]
  }, async (request, reply) => {
    const body = updateSubscriptionSchema.parse(request.body);

    if (body.setupKey !== env.ADMIN_SETUP_KEY) {
      return reply.code(403).send({ message: "Qurulum açarı yanlışdır." });
    }

    const clinic = await app.prisma.clinic.findUnique({
      where: { id: body.clinicId }
    });

    if (!clinic) {
      return reply.code(404).send({ message: "Klinik bulunamadı." });
    }

    const plan = subscriptionPlans[body.subscriptionPlan as keyof typeof subscriptionPlans];
    if (!plan) {
      return reply.code(400).send({ message: "Geçersiz abonelik planı." });
    }

    const updatedClinic = await app.prisma.clinic.update({
      where: { id: body.clinicId },
      data: {
        subscriptionPlan: body.subscriptionPlan,
        subscriptionStatus: body.subscriptionStatus,
        subscriptionEnd: body.subscriptionEnd ? new Date(body.subscriptionEnd) : undefined,
        maxUsers: plan.maxUsers,
        maxPatients: plan.maxPatients
      }
    });

    return reply.send({
      clinic: updatedClinic,
      plan
    });
  });

  // Abonelik kontrolü middleware (diğer route'larda kullanılacak)
  app.decorate('checkSubscription', async (request: any, reply: any) => {
    const clinicId = request.user?.clinicId;
    if (!clinicId) return;

    const clinic = await app.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        subscriptionStatus: true,
        subscriptionEnd: true,
        maxUsers: true,
        maxPatients: true,
        _count: {
          select: {
            users: true,
            patients: true
          }
        }
      }
    });

    if (!clinic) {
      return reply.code(403).send({ message: "Klinik bulunamadı." });
    }

    // Abonelik kontrolü
    if (clinic.subscriptionStatus === "expired" || clinic.subscriptionStatus === "cancelled") {
      return reply.code(403).send({ message: "Abonelik süresi dolmuş. Lütfen abonelik yenileyin." });
    }

    if (clinic.subscriptionEnd && clinic.subscriptionEnd instanceof Date && clinic.subscriptionEnd < new Date()) {
      // Trial süresi dolmuş, expired yap
      await app.prisma.clinic.update({
        where: { id: clinicId },
        data: { subscriptionStatus: "expired" }
      });
      return reply.code(403).send({ message: "Trial süreniz dolmuştur. Abonelik satın alın." });
    }

    // Limit kontrolü
    if (clinic._count.users >= clinic.maxUsers) {
      return reply.code(403).send({ message: `Kullanıcı limiti aşıldı (${clinic.maxUsers}). Abonelik yükseltin.` });
    }

    if (clinic._count.patients >= clinic.maxPatients) {
      return reply.code(403).send({ message: `Hasta limiti aşıldı (${clinic.maxPatients}). Abonelik yükseltin.` });
    }

    // Request'e clinic bilgilerini ekle
    request.clinic = clinic;
  });
}
