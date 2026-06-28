import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizePhone } from "../services/phone-utils.js";
import {
  patientAdministrativeFields,
  patientAdministrativeWriteData,
  validatePatientAdministrativeFields,
} from "../services/patient-administrative-fields.js";

function mapAppointment(row: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  channel: string;
  notes: string | null;
  doctor: {
    id: string;
    title: string;
    firstName: string;
    lastName: string;
    branch: string;
  };
}) {
  return {
    id: row.id,
    doctorId: row.doctor.id,
    doctorName: `${row.doctor.title} ${row.doctor.firstName} ${row.doctor.lastName}`,
    branch: row.doctor.branch,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    channel: row.channel,
    notes: row.notes
  };
}

function mapMedicalRecord(row: {
  id: string;
  diagnosis: string;
  treatmentPlan: string;
  prescribedBy: string;
  reportType: string;
  testResults: unknown;
  attachments: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    diagnosis: row.diagnosis,
    treatmentPlan: row.treatmentPlan,
    prescribedBy: row.prescribedBy,
    reportType: row.reportType,
    testResults: row.testResults,
    attachments: row.attachments,
    createdAt: row.createdAt.toISOString()
  };
}

const createPatientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  identityNumber: z.string().trim().min(3).max(80),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]),
  birthDate: z.string().datetime(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  ...patientAdministrativeFields,
}).superRefine(validatePatientAdministrativeFields);

const listQuerySchema = z.object({
  q: z.string().optional(),
  patientType: z.enum(["LOCAL", "FOREIGN"]).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50)
});

export async function patientRoutes(app: FastifyInstance) {
  app.get(
    "/patients/me",
    {
      preHandler: [app.authenticate, app.authorize(["PATIENT"])]
    },
    async (request, reply) => {
      const userId = request.user.sub;
      if (!userId) {
        return reply.code(401).send({
          message: "Giriş tələb olunur."
        });
      }

      const profile = await app.prisma.patientProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              email: true
            }
          },
          appointments: {
            include: {
              doctor: true
            },
            orderBy: {
              startsAt: "desc"
            }
          },
          medicalRecords: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });

      if (!profile) {
        return reply.code(404).send({
          message: "Pasiyent profili tapılmadı."
        });
      }

      const now = new Date();

      return {
        id: profile.id,
        email: profile.user.email,
        fullName: `${profile.firstName} ${profile.lastName}`,
        identityNumber: profile.identityNumber,
        phone: profile.phone,
        patientType: profile.patientType,
        citizenshipCountryCode: profile.citizenshipCountryCode,
        identityDocumentType: profile.identityDocumentType,
        identityDocumentExpiry: profile.identityDocumentExpiry?.toISOString() ?? null,
        preferredLanguage: profile.preferredLanguage,
        interpreterRequired: profile.interpreterRequired,
        gender: profile.gender,
        birthDate: profile.birthDate.toISOString(),
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions,
        upcomingAppointments: profile.appointments.filter((item: { startsAt: Date }) => item.startsAt >= now).map(mapAppointment),
        pastAppointments: profile.appointments.filter((item: { startsAt: Date }) => item.startsAt < now).map(mapAppointment),
        medicalRecords: profile.medicalRecords.map(mapMedicalRecord)
      };
    }
  );

  app.get(
    "/patients",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER", "NURSE", "DOCTOR", "CASHIER", "ACCOUNTANT"])]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId; // ✅ əlavə edildi

      const rows = (await app.prisma.patientProfile.findMany({
        where: {
          clinicId, // ✅ yalnız öz klinikasının xəstələri
          ...(query.patientType ? { patientType: query.patientType } : {}),
          ...(query.q
            ? {
                OR: [
                  { firstName: { contains: query.q } },
                  { lastName: { contains: query.q } },
                  { identityNumber: { contains: query.q } },
                  { phone: { contains: query.q } },
                  { citizenshipCountryCode: { contains: query.q.toUpperCase() } }
                ]
              }
            : {})
        },
        include: {
          user: { select: { email: true } }
        },
        orderBy: [{ createdAt: "desc" }],
        take: query.take
      })) as Array<{
        id: string;
        identityNumber: string;
        firstName: string;
        lastName: string;
        phone: string;
        patientType: string;
        citizenshipCountryCode: string;
        identityDocumentType: string;
        identityDocumentExpiry: Date | null;
        preferredLanguage: string;
        interpreterRequired: boolean;
        gender: string;
        birthDate: Date;
        createdAt: Date;
        user: { email: string };
      }>;

      return rows.map((row) => ({
        id: row.id,
        email: row.user.email,
        identityNumber: row.identityNumber,
        fullName: `${row.firstName} ${row.lastName}`,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        patientType: row.patientType,
        citizenshipCountryCode: row.citizenshipCountryCode,
        identityDocumentType: row.identityDocumentType,
        identityDocumentExpiry: row.identityDocumentExpiry,
        preferredLanguage: row.preferredLanguage,
        interpreterRequired: row.interpreterRequired,
        gender: row.gender,
        birthDate: row.birthDate,
        createdAt: row.createdAt
      }));
    }
  );

  app.post(
    "/patients",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER"])]
    },
    async (request, reply) => {
      const body = createPatientSchema.parse(request.body);

      const passwordHash = await bcrypt.hash(body.password, 10);

      const patient = await app.prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: {
            email: body.email,
            passwordHash,
            role: "PATIENT",
            clinicId: request.user.clinicId
          }
        });

        return tx.patientProfile.create({
          data: {
            userId: user.id,
            clinicId: request.user.clinicId,
            identityNumber: body.identityNumber,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            phoneNormalized: normalizePhone(body.phone, body.patientType === "FOREIGN" ? null : "994"),
            ...patientAdministrativeWriteData(body),
            gender: body.gender,
            birthDate: new Date(body.birthDate),
            bloodType: body.bloodType,
            allergies: body.allergies,
            chronicConditions: body.chronicConditions
          }
        });
      });

      return reply.code(201).send({
        id: patient.id
      });
    }
  );

  app.get(
    "/patients/:id/details",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER", "NURSE", "DOCTOR"])]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const clinicId = request.user.clinicId; // ✅ əlavə edildi

      const profile = await app.prisma.patientProfile.findFirst({
        where: {
          id: params.id,
          clinicId
        },
        include: {
          user: {
            select: {
              email: true
            }
          },
          appointments: {
            include: {
              doctor: true
            },
            orderBy: {
              startsAt: "desc"
            }
          },
          medicalRecords: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });

      if (!profile) {
        return reply.code(404).send({
          message: "Pasiyent tapılmadı."
        });
      }

      return {
        id: profile.id,
        email: profile.user.email,
        fullName: `${profile.firstName} ${profile.lastName}`,
        identityNumber: profile.identityNumber,
        phone: profile.phone,
        patientType: profile.patientType,
        citizenshipCountryCode: profile.citizenshipCountryCode,
        identityDocumentType: profile.identityDocumentType,
        identityDocumentExpiry: profile.identityDocumentExpiry?.toISOString() ?? null,
        preferredLanguage: profile.preferredLanguage,
        interpreterRequired: profile.interpreterRequired,
        gender: profile.gender,
        birthDate: profile.birthDate.toISOString(),
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions,
        appointments: profile.appointments.map(mapAppointment),
        medicalRecords: profile.medicalRecords.map(mapMedicalRecord)
      };
    }
  );
}
