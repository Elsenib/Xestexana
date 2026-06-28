import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";

import { normalizePhone } from "../apps/api/dist/services/phone-utils.js";
import {
  patientAdministrativeFields,
  validatePatientAdministrativeFields,
} from "../apps/api/dist/services/patient-administrative-fields.js";

const schema = z.object({
  identityNumber: z.string(),
  phone: z.string(),
  ...patientAdministrativeFields,
}).superRefine(validatePatientAdministrativeFields);

test("local patient keeps Azerbaijan defaults", () => {
  const patient = schema.parse({ identityNumber: "AA1234567", phone: "050 111 22 33" });
  assert.equal(patient.patientType, "LOCAL");
  assert.equal(patient.citizenshipCountryCode, "AZ");
  assert.equal(normalizePhone(patient.phone), "994501112233");
});

test("foreign patient keeps the supplied international identity", () => {
  const patient = schema.parse({
    identityNumber: "U1234567",
    phone: "+90 532 111 22 33",
    patientType: "FOREIGN",
    citizenshipCountryCode: "tr",
    identityDocumentType: "PASSPORT",
    identityDocumentExpiry: "2030-06-29T00:00:00.000Z",
    preferredLanguage: "TR",
  });
  assert.equal(patient.citizenshipCountryCode, "TR");
  assert.equal(normalizePhone(patient.phone, null), "905321112233");
});

test("foreign patient requires a foreign country and international phone", () => {
  const result = schema.safeParse({
    identityNumber: "P123456",
    phone: "0501112233",
    patientType: "FOREIGN",
    citizenshipCountryCode: "AZ",
    identityDocumentType: "PASSPORT",
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "citizenshipCountryCode"));
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "phone"));
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "identityDocumentExpiry"));
});
