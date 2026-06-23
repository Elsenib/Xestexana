import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  actorFromRequest,
  auditRequestMeta,
  recordAudit,
} from "../services/audit-service.js";

const fileReaders = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "CALL_CENTER"] as const;
const fileUploaders = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"] as const;

const uploadSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(120),
  category: z.enum(["GENERAL", "XRAY", "DOCUMENT", "CONSENT"]).default("GENERAL"),
  contentBase64: z.string().min(16).max(8_000_000),
});

function uploadsRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function safeOriginalName(name: string) {
  return name.replace(/[^\w.\-() azəğıöüçşİƏĞÖÜÇŞ]+/gi, "_");
}

export async function patientFileRoutes(app: FastifyInstance) {
  app.get(
    "/patients/:patientId/files",
    { preHandler: [app.authenticate, app.authorize([...fileReaders])] },
    async (request, reply) => {
      const { patientId } = z.object({ patientId: z.string().min(1) }).parse(request.params);
      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

      const rows = await app.prisma.patientFile.findMany({
        where: { clinicId: request.user.clinicId, patientId },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { email: true } } },
      });

      return rows.map((row) => ({
        id: row.id,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        category: row.category,
        createdAt: row.createdAt.toISOString(),
        uploadedBy: row.uploadedBy.email,
      }));
    },
  );

  app.post(
    "/patients/:patientId/files",
    { preHandler: [app.authenticate, app.authorize([...fileUploaders])] },
    async (request, reply) => {
      const { patientId } = z.object({ patientId: z.string().min(1) }).parse(request.params);
      const body = uploadSchema.parse(request.body);
      const userId = request.user.sub;
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

      const buffer = Buffer.from(body.contentBase64, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.code(413).send({ message: "Fayl 5 MB-dan böyük ola bilməz." });
      }

      const contentSha256 = createHash("sha256").update(buffer).digest("hex");
      const storageKey = `${request.user.clinicId}/${patientId}/${Date.now()}-${safeOriginalName(body.originalName)}`;

      // Local fallback saxlanır, amma əsas etibarlı mənbə DB-dəki content sahəsidir.
      const fullPath = path.join(uploadsRoot(), storageKey);
      ensureDir(path.dirname(fullPath));
      writeFileSync(fullPath, buffer);

      const file = await app.prisma.patientFile.create({
        data: {
          clinicId: request.user.clinicId,
          patientId,
          uploadedByUserId: userId,
          originalName: body.originalName,
          mimeType: body.mimeType,
          sizeBytes: buffer.length,
          storageKey,
          content: buffer,
          contentSha256,
          category: body.category,
        },
      });

      await recordAudit(app.prisma, {
        ...actorFromRequest(request),
        ...auditRequestMeta(request),
        category: AUDIT_CATEGORIES.CLINICAL,
        action: AUDIT_ACTIONS.FILE_UPLOADED,
        entityType: "PatientFile",
        entityId: file.id,
        summary: `Fayl yükləndi: ${body.originalName}`,
        details: { patientId, category: body.category, sizeBytes: buffer.length, contentSha256 },
      });

      return reply.code(201).send({ id: file.id, originalName: file.originalName });
    },
  );

  app.get(
    "/patients/:patientId/files/:fileId/download",
    { preHandler: [app.authenticate, app.authorize([...fileReaders])] },
    async (request, reply) => {
      const params = z.object({ patientId: z.string().min(1), fileId: z.string().min(1) }).parse(request.params);
      const file = await app.prisma.patientFile.findFirst({
        where: {
          id: params.fileId,
          patientId: params.patientId,
          clinicId: request.user.clinicId,
        },
      });
      if (!file) return reply.code(404).send({ message: "Fayl tapılmadı." });

      const fullPath = path.join(uploadsRoot(), file.storageKey);
      const data = file.content ?? (existsSync(fullPath) ? readFileSync(fullPath) : null);
      if (!data) {
        return reply.code(404).send({
          message: "Fayl anbarında tapılmadı. Bu, köhnə local storage-də qalmış fayl ola bilər.",
        });
      }

      await recordAudit(app.prisma, {
        ...actorFromRequest(request),
        ...auditRequestMeta(request),
        category: AUDIT_CATEGORIES.CLINICAL,
        action: AUDIT_ACTIONS.FILE_VIEWED,
        entityType: "PatientFile",
        entityId: file.id,
        summary: `Fayl baxıldı: ${file.originalName}`,
        details: { patientId: params.patientId },
      });

      return reply
        .header("Content-Type", file.mimeType)
        .header("Content-Disposition", `inline; filename="${file.originalName}"`)
        .send(data);
    },
  );
}
