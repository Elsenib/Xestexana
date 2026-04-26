import { z } from "zod";
const createClinicWithSubscriptionSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    phone: z.string().optional(),
    logo: z.string().optional(),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
    subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic")
});
const updateSubscriptionSchema = z.object({
    clinicId: z.string(),
    subscriptionPlan: z.string(),
    subscriptionStatus: z.enum(["trial", "active", "expired", "cancelled"]),
    subscriptionEnd: z.string().datetime().optional()
});
const subscriptionPlans = {
    basic: {
        name: "Temel Paket",
        price: 300, // AZN/ay
        maxUsers: 5,
        maxPatients: 100,
        features: ["Hasta yönetimi", "Temel raporlar", "5 kullanıcı"]
    },
    professional: {
        name: "Profesyonel Paket",
        price: 500, // AZN/ay
        maxUsers: 15,
        maxPatients: 500,
        features: ["Tüm temel özellikler", "Gelişmiş raporlar", "15 kullanıcı", "API erişimi"]
    },
    enterprise: {
        name: "Kurumsal Paket",
        price: 800, // AZN/ay
        maxUsers: 50,
        maxPatients: 2000,
        features: ["Tüm özellikler", "Özel geliştirme", "50 kullanıcı", "Öncelikli destek"]
    }
};
export async function subscriptionRoutes(app) {
    // Klinik oluşturma + Admin hesabı + Abonelik başlatma
    app.post("/subscription/create-clinic", async (request, reply) => {
        const body = createClinicWithSubscriptionSchema.parse(request.body);
        const plan = subscriptionPlans[body.subscriptionPlan];
        // Klinik oluştur
        const clinic = await app.prisma.clinic.create({
            data: {
                name: body.name,
                address: body.address,
                phone: body.phone,
                logo: body.logo,
                subscriptionPlan: body.subscriptionPlan,
                subscriptionStatus: "trial",
                subscriptionStart: new Date(),
                subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün trial
                maxUsers: plan.maxUsers,
                maxPatients: plan.maxPatients
            }
        });
        // Admin kullanıcısı oluştur
        const passwordHash = await app.prisma.$transaction(async (tx) => {
            const hash = await require("bcryptjs").hash(body.adminPassword, 10);
            await tx.user.create({
                data: {
                    email: body.adminEmail,
                    passwordHash: hash,
                    role: "ADMIN",
                    clinicId: clinic.id
                }
            });
            return hash;
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
        const { clinicId } = request.params;
        // Sadece kendi klinik bilgilerini görebilir
        if (request.user.clinicId !== clinicId && request.user.role !== "ADMIN") {
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
        const plan = subscriptionPlans[(clinic.subscriptionPlan || "basic")];
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
        const clinic = await app.prisma.clinic.findUnique({
            where: { id: body.clinicId }
        });
        if (!clinic) {
            return reply.code(404).send({ message: "Klinik bulunamadı." });
        }
        const plan = subscriptionPlans[body.subscriptionPlan];
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
    app.decorate('checkSubscription', async (request, reply) => {
        const clinicId = request.user?.clinicId;
        if (!clinicId)
            return;
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
