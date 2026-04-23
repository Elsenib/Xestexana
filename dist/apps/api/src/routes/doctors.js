import bcrypt from "bcryptjs";
import { z } from "zod";
const createDoctorSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    title: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    branch: z.string().min(1),
    roomNumber: z.string().optional(),
    active: z.boolean().default(true)
});
const listQuerySchema = z.object({
    branch: z.string().optional(),
    active: z.coerce.boolean().optional(),
    take: z.coerce.number().int().min(1).max(200).default(50)
});
export async function doctorRoutes(app) {
    app.get("/doctors/me/dashboard", {
        preHandler: [app.authenticate, app.authorize(["DOCTOR"])]
    }, async (request, reply) => {
        const userId = request.user.sub;
        if (!userId) {
            return reply.code(401).send({
                message: "GiriÅŸ tÉ™lÉ™b olunur."
            });
        }
        const doctor = await app.prisma.doctorProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        email: true
                    }
                },
                appointments: {
                    include: {
                        patient: {
                            include: {
                                medicalRecords: {
                                    orderBy: {
                                        createdAt: "desc"
                                    },
                                    take: 1
                                }
                            }
                        }
                    },
                    orderBy: {
                        startsAt: "asc"
                    },
                    take: 50
                }
            }
        });
        if (!doctor) {
            return reply.code(404).send({
                message: "HÉ™kim profili tapÄ±lmadÄ±."
            });
        }
        const patientMap = new Map();
        for (const appointment of doctor.appointments) {
            const latestRecord = appointment.patient.medicalRecords[0];
            if (!patientMap.has(appointment.patient.id)) {
                patientMap.set(appointment.patient.id, {
                    id: appointment.patient.id,
                    fullName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                    identityNumber: appointment.patient.identityNumber,
                    phone: appointment.patient.phone,
                    gender: appointment.patient.gender,
                    birthDate: appointment.patient.birthDate.toISOString(),
                    latestRecord: latestRecord
                        ? {
                            diagnosis: latestRecord.diagnosis,
                            treatmentPlan: latestRecord.treatmentPlan,
                            prescribedBy: latestRecord.prescribedBy,
                            createdAt: latestRecord.createdAt.toISOString()
                        }
                        : null
                });
            }
        }
        return {
            doctor: {
                id: doctor.id,
                email: doctor.user.email,
                fullName: `${doctor.title} ${doctor.firstName} ${doctor.lastName}`,
                branch: doctor.branch,
                roomNumber: doctor.roomNumber,
                active: doctor.active
            },
            appointments: doctor.appointments.map((appointment) => ({
                id: appointment.id,
                patientId: appointment.patient.id,
                patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                identityNumber: appointment.patient.identityNumber,
                phone: appointment.patient.phone,
                startsAt: appointment.startsAt.toISOString(),
                endsAt: appointment.endsAt.toISOString(),
                status: appointment.status,
                channel: appointment.channel,
                notes: appointment.notes
            })),
            patients: Array.from(patientMap.values())
        };
    });
    app.get("/doctors", {
        preHandler: [app.authenticate]
    }, async (request) => {
        const query = listQuerySchema.parse(request.query);
        const rows = await app.prisma.doctorProfile.findMany({
            where: {
                ...(query.branch ? { branch: query.branch } : {}),
                ...(query.active === undefined ? {} : { active: query.active })
            },
            include: {
                user: { select: { email: true } }
            },
            orderBy: [{ branch: "asc" }, { lastName: "asc" }],
            take: query.take
        });
        return rows.map((row) => ({
            id: row.id,
            email: row.user.email,
            fullName: `${row.title} ${row.firstName} ${row.lastName}`,
            title: row.title,
            firstName: row.firstName,
            lastName: row.lastName,
            branch: row.branch,
            roomNumber: row.roomNumber,
            active: row.active,
            createdAt: row.createdAt
        }));
    });
    app.post("/doctors", {
        preHandler: [app.authenticate, app.authorize(["ADMIN"])]
    }, async (request, reply) => {
        const body = createDoctorSchema.parse(request.body);
        const passwordHash = await bcrypt.hash(body.password, 10);
        const doctor = await app.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: body.email,
                    passwordHash,
                    role: "DOCTOR"
                }
            });
            return tx.doctorProfile.create({
                data: {
                    userId: user.id,
                    title: body.title,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    branch: body.branch,
                    roomNumber: body.roomNumber,
                    active: body.active
                }
            });
        });
        return reply.code(201).send({
            id: doctor.id
        });
    });
    app.patch("/doctors/:id/deactivate", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
        const { id } = request.params;
        const doctor = await app.prisma.doctorProfile.findUnique({ where: { id } });
        if (!doctor)
            return reply.code(404).send({ message: "Hekim tapilmadi." });
        await app.prisma.doctorProfile.update({ where: { id }, data: { active: false } });
        return { message: "Hekim deaktiv edildi." };
    });
}
