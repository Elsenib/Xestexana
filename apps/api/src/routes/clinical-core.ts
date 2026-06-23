import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  APPROVAL_ACTIONS,
  approvalStatusMessage,
  createApprovalRequest,
  needsApproval,
} from "../services/approval-service.js";

const patientParams = z.object({ id: z.string().min(1) });
const encounterParams = z.object({ id: z.string().min(1) });
const textList = z.array(z.string().trim().min(1).max(200)).max(50).default([]);

const anamnesisSchema = z.object({
  allergies: textList, chronicConditions: textList, infectiousDiseases: textList, regularMedications: textList,
  pregnancyOrRisk: z.string().max(1000).nullable().optional(), pastSurgeries: z.string().max(2000).nullable().optional(),
  medicalNotes: z.string().max(4000).nullable().optional(), criticalAlert: z.string().max(500).nullable().optional(),
  confirmedByPatient: z.boolean().default(false)
});

const toothEntrySchema = z.object({
  tooth: z.string().regex(/^([1-8][1-8]|[5-8][1-5])$/),
  surfaces: z.array(z.enum(["M", "D", "B", "L", "O", "I", "ROOT", "WHOLE"])).max(8).default(["WHOLE"]),
  condition: z.enum(["HEALTHY", "CARIES", "FILLING", "ROOT_CANAL", "CROWN", "IMPLANT", "EXTRACTED", "MISSING", "FRACTURE", "OTHER"]),
  phase: z.enum(["EXISTING", "PLANNED"]), note: z.string().max(500).optional()
});
const odontogramSchema = z.object({
  clinicalEncounterId: z.string().nullable().optional(), numberingSystem: z.literal("FDI").default("FDI"),
  dentition: z.enum(["PERMANENT", "PRIMARY", "MIXED"]).default("PERMANENT"), entries: z.array(toothEntrySchema).max(256),
  note: z.string().max(2000).nullable().optional()
});
const encounterContent = z.object({
  complaint: z.string().max(4000).nullable().optional(), examination: z.string().max(4000).nullable().optional(),
  diagnosis: z.string().max(4000).nullable().optional(), clinicalNotes: z.string().max(8000).nullable().optional(),
  recommendations: z.string().max(4000).nullable().optional(), prescription: z.string().max(4000).nullable().optional(),
  nextVisitAt: z.string().datetime().nullable().optional()
});
const createEncounterSchema = encounterContent.extend({
  patientId: z.string().min(1),
  appointmentId: z.string().nullable().optional(),
  doctorUserId: z.string().min(1).optional(),
});
const amendEncounterSchema = encounterContent.extend({ reason: z.string().trim().min(5).max(1000) });

export async function clinicalCoreRoutes(app: FastifyInstance) {
  app.get("/patients/:id/clinical-summary", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR", "NURSE", "CALL_CENTER"])] }, async (request, reply) => {
    const { id } = patientParams.parse(request.params);
    const patient = await app.prisma.patientProfile.findFirst({
      where: { id, clinicId: request.user.clinicId },
      select: {
        id: true, firstName: true, lastName: true, identityNumber: true, phone: true, gender: true, birthDate: true, bloodType: true,
        anamnesisVersions: { orderBy: { version: "desc" }, take: 10 },
        odontogramSnapshots: { orderBy: { createdAt: "desc" }, take: 20 },
        clinicalEncounters: { orderBy: { createdAt: "desc" }, take: 30, include: { doctor: { select: { email: true } }, revisions: { orderBy: { revision: "desc" } } } }
      }
    });
    if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });
    return patient;
  });

  app.post("/patients/:id/anamnesis", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR", "NURSE"])] }, async (request, reply) => {
    const { id: patientId } = patientParams.parse(request.params); const body = anamnesisSchema.parse(request.body); const userId = request.user.sub;
    if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });
    const patient = await app.prisma.patientProfile.findFirst({ where: { id: patientId, clinicId: request.user.clinicId }, select: { id: true } });
    if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });
    const latest = await app.prisma.patientAnamnesisVersion.findFirst({ where: { patientId }, orderBy: { version: "desc" }, select: { version: true } });
    const record = await app.prisma.patientAnamnesisVersion.create({ data: { ...body, patientId, clinicId: request.user.clinicId, version: (latest?.version ?? 0) + 1, confirmedAt: body.confirmedByPatient ? new Date() : null, recordedByUserId: userId } });
    return reply.code(201).send(record);
  });

  app.post("/patients/:id/odontograms", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR", "NURSE"])] }, async (request, reply) => {
    const { id: patientId } = patientParams.parse(request.params); const body = odontogramSchema.parse(request.body); const userId = request.user.sub;
    if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });
    const patient = await app.prisma.patientProfile.findFirst({ where: { id: patientId, clinicId: request.user.clinicId }, select: { id: true } });
    if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });
    if (body.clinicalEncounterId) {
      const encounter = await app.prisma.clinicalEncounter.findFirst({ where: { id: body.clinicalEncounterId, patientId, clinicId: request.user.clinicId }, select: { id: true } });
      if (!encounter) return reply.code(400).send({ message: "Klinik qəbul bu pasiyentə aid deyil." });
    }
    const snapshot = await app.prisma.odontogramSnapshot.create({ data: { ...body, patientId, clinicId: request.user.clinicId, authoredByUserId: userId } });
    return reply.code(201).send(snapshot);
  });

  app.post("/clinical-encounters", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR", "NURSE"])] }, async (request, reply) => {
    const body = createEncounterSchema.parse(request.body);
    const userId = request.user.sub;
    if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

    const doctorUserId =
      request.user.role === "NURSE"
        ? body.doctorUserId
        : userId;
    if (!doctorUserId) {
      return reply.code(400).send({ message: "Assistent üçün məsul həkim seçilməlidir." });
    }

    const doctor = await app.prisma.user.findFirst({
      where: { id: doctorUserId, clinicId: request.user.clinicId, role: "DOCTOR", active: true },
      select: { id: true },
    });
    if (!doctor) return reply.code(400).send({ message: "Məsul həkim tapılmadı." });

    const patient = await app.prisma.patientProfile.findFirst({ where: { id: body.patientId, clinicId: request.user.clinicId }, select: { id: true } });
    if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

    const { doctorUserId: _ignored, ...encounterBody } = body;
    const encounter = await app.prisma.clinicalEncounter.create({
      data: {
        ...encounterBody,
        nextVisitAt: body.nextVisitAt ? new Date(body.nextVisitAt) : null,
        clinicId: request.user.clinicId,
        doctorUserId,
      },
    });
    return reply.code(201).send(encounter);
  });

  app.post("/clinical-encounters/:id/complete", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR", "NURSE"])] }, async (request, reply) => {
    const { id } = encounterParams.parse(request.params);
    const userId = request.user.sub!;
    const encounter = await app.prisma.clinicalEncounter.findFirst({ where: { id, clinicId: request.user.clinicId } });
    if (!encounter) return reply.code(404).send({ message: "Klinik qəbul tapılmadı." });
    if (encounter.status !== "DRAFT") return reply.code(409).send({ message: "Yalnız qaralama qəbul tamamlana bilər." });
    if (!encounter.diagnosis?.trim()) return reply.code(400).send({ message: "Tamamlamaq üçün diaqnoz daxil edilməlidir." });

    if (needsApproval(request.user.role, APPROVAL_ACTIONS.CLINICAL_ENCOUNTER_COMPLETE)) {
      const approval = await createApprovalRequest(app.prisma, {
        clinicId: request.user.clinicId,
        requestedByUserId: userId,
        requesterRole: request.user.role,
        actionType: APPROVAL_ACTIONS.CLINICAL_ENCOUNTER_COMPLETE,
        entityType: "ClinicalEncounter",
        entityId: id,
        payload: { encounterId: id },
        supervisingDoctorUserId: encounter.doctorUserId,
      });
      return reply.code(202).send({
        approvalId: approval.id,
        status: approval.status,
        message: approvalStatusMessage(approval.reviewerRole, approval.reviewerUserId),
      });
    }

    return app.prisma.clinicalEncounter.update({
      where: { id },
      data: { status: "COMPLETED", signedAt: new Date(), completedAt: new Date() },
    });
  });

  app.post("/clinical-encounters/:id/amend", { preHandler: [app.authenticate, app.authorize(["ADMIN", "DOCTOR"])] }, async (request, reply) => {
    const { id } = encounterParams.parse(request.params); const body = amendEncounterSchema.parse(request.body); const userId = request.user.sub;
    if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });
    const current = await app.prisma.clinicalEncounter.findFirst({ where: { id, clinicId: request.user.clinicId }, include: { _count: { select: { revisions: true } } } });
    if (!current) return reply.code(404).send({ message: "Klinik qəbul tapılmadı." });
    if (current.status !== "COMPLETED") return reply.code(409).send({ message: "Qaralama qeyd birbaşa redaktə edilməlidir." });
    const { reason, ...replacement } = body;
    const previousContent = { complaint: current.complaint, examination: current.examination, diagnosis: current.diagnosis, clinicalNotes: current.clinicalNotes, recommendations: current.recommendations, prescription: current.prescription, nextVisitAt: current.nextVisitAt };
    await app.prisma.$transaction([
      app.prisma.clinicalEncounterRevision.create({ data: { clinicId: request.user.clinicId, encounterId: id, revision: current._count.revisions + 1, reason, previousContent, replacementContent: replacement, authoredByUserId: userId } }),
      app.prisma.clinicalEncounter.update({ where: { id }, data: { ...replacement, nextVisitAt: replacement.nextVisitAt ? new Date(replacement.nextVisitAt) : replacement.nextVisitAt } })
    ]);
    return reply.code(201).send({ message: "Düzəliş tarixçədə saxlanıldı." });
  });
}
