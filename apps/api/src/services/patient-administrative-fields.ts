import { z } from "zod";

export const patientAdministrativeFields = {
  patientType: z.enum(["LOCAL", "FOREIGN"]).default("LOCAL"),
  citizenshipCountryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).default("AZ"),
  identityDocumentType: z.enum(["NATIONAL_ID", "PASSPORT", "RESIDENCE_PERMIT", "OTHER"]).default("NATIONAL_ID"),
  identityDocumentExpiry: z.string().datetime().nullable().optional(),
  preferredLanguage: z.enum(["AZ", "TR", "RU", "EN", "OTHER"]).default("AZ"),
  interpreterRequired: z.boolean().default(false),
};

export type PatientAdministrativeInput = {
  patientType: "LOCAL" | "FOREIGN";
  citizenshipCountryCode: string;
  identityDocumentType: "NATIONAL_ID" | "PASSPORT" | "RESIDENCE_PERMIT" | "OTHER";
  identityDocumentExpiry?: string | null;
  preferredLanguage: "AZ" | "TR" | "RU" | "EN" | "OTHER";
  interpreterRequired: boolean;
  identityNumber: string;
  phone: string;
};

export function validatePatientAdministrativeFields(
  value: PatientAdministrativeInput,
  context: z.RefinementCtx,
) {
  if (value.patientType === "LOCAL" && value.identityNumber.trim().length < 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identityNumber"],
      message: "Yerli pasiyent üçün FIN/şəxsiyyət nömrəsi ən azı 5 simvol olmalıdır.",
    });
  }

  if (value.patientType === "FOREIGN") {
    if (value.citizenshipCountryCode === "AZ") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["citizenshipCountryCode"],
        message: "Xarici pasiyent üçün vətəndaşlıq ölkəsi AZ ola bilməz.",
      });
    }
    if (!/^(?:\+|00)/.test(value.phone.trim())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Xarici pasiyentin telefonu ölkə kodu ilə yazılmalıdır (məsələn +90...).",
      });
    }
    const phoneDigits = value.phone.replace(/\D/g, "").replace(/^00/, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Beynəlxalq telefon nömrəsi 8–15 rəqəm olmalıdır.",
      });
    }
    if (value.identityDocumentType === "PASSPORT" && !value.identityDocumentExpiry) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identityDocumentExpiry"],
        message: "Pasportun bitmə tarixi daxil edilməlidir.",
      });
    }
  }
}

export function patientAdministrativeWriteData(value: PatientAdministrativeInput) {
  return {
    patientType: value.patientType,
    citizenshipCountryCode: value.citizenshipCountryCode,
    identityDocumentType: value.identityDocumentType,
    identityDocumentExpiry: value.identityDocumentExpiry ? new Date(value.identityDocumentExpiry) : null,
    preferredLanguage: value.preferredLanguage,
    interpreterRequired: value.interpreterRequired,
  };
}
