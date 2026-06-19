import type { FastifyInstance } from "fastify";
import { z } from "zod";

const testResultSchema = z.object({
  id: z.string().min(1),
  testName: z.string().min(1).max(100),
  value: z.string().max(100),
  unit: z.string().max(50),
  referenceRange: z.string().max(100),
  status: z.enum(["normal", "high", "low", "critical"])
});

const createMedicalRecordSchema = z.object({
  patientId: z.string().min(1),
  diagnosis: z.string().min(3),
  treatmentPlan: z.string().min(3),
  reportType: z.enum([
    "general",
    "blood-test",
    "x-ray",
    "ultrasound",
    "ecg",
    "biopsy",
    "consultation"
  ]).default("general"),
  testResults: z.array(testResultSchema).max(100).default([]),
  attachments: z.array(z.string().max(500)).max(20).default([])
});

export async function medicalRecordRoutes(app: FastifyInstance) {
  app.post(
    "/medical-records",
    {
      preHandler: [app.authenticate, app.authorize(["DOCTOR", "ADMIN", "NURSE"])]
    },
    async (request, reply) => {
      const body = createMedicalRecordSchema.parse(request.body);
      const userId = request.user.sub;

      let prescribedBy = request.user.email;

      if (request.user.role === "DOCTOR" && userId) {
        const doctor = await app.prisma.doctorProfile.findUnique({
          where: { userId },
          select: {
            title: true,
            firstName: true,
            lastName: true
          }
        });

        if (doctor) {
          prescribedBy = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;
        }
      }

      const patient = await app.prisma.patientProfile.findFirst({
        where: {
          id: body.patientId,
          clinicId: request.user.clinicId
        },
        select: { id: true }
      });

      if (!patient) {
        return reply.code(400).send({
          message: "Pasiyent bu klinikaya aid deyil."
        });
      }

      const record = await app.prisma.medicalRecord.create({
        data: {
          patientId: body.patientId,
          clinicId: request.user.clinicId,
          diagnosis: body.diagnosis,
          treatmentPlan: body.treatmentPlan,
          prescribedBy,
          reportType: body.reportType,
          testResults: body.testResults,
          attachments: body.attachments
        }
      });

      return reply.code(201).send({
        id: record.id,
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan,
        prescribedBy: record.prescribedBy,
        reportType: record.reportType,
        testResults: record.testResults,
        attachments: record.attachments,
        createdAt: record.createdAt.toISOString()
      });
    }
  );
}
