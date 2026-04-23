import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createMedicalRecordSchema = z.object({
  patientId: z.string().min(1),
  diagnosis: z.string().min(3),
  treatmentPlan: z.string().min(3)
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

      const record = await app.prisma.medicalRecord.create({
        data: {
          patientId: body.patientId,
          diagnosis: body.diagnosis,
          treatmentPlan: body.treatmentPlan,
          prescribedBy
        }
      });

      return reply.code(201).send({
        id: record.id,
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan,
        prescribedBy: record.prescribedBy,
        createdAt: record.createdAt.toISOString()
      });
    }
  );
}