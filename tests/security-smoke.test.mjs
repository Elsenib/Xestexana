import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/hospital_platform";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-only-jwt-secret-with-at-least-32-characters";
process.env.ADMIN_SETUP_KEY =
  process.env.ADMIN_SETUP_KEY ?? "test-only-private-admin-setup-key";
process.env.WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN ?? "test-whatsapp-verify-token";
process.env.WHATSAPP_APP_SECRET =
  process.env.WHATSAPP_APP_SECRET ?? "test-whatsapp-app-secret-at-least-16";
process.env.WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID ?? "test-phone-number-id";

let app;

before(async () => {
  const { buildApp } = await import("../apps/api/dist/app.js");
  app = buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
});

test("health endpoint remains public", async () => {
  const response = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 200);
});

test("CORS allows the local web application", async () => {
  const response = await app.inject({
    method: "OPTIONS",
    url: "/api/health",
    headers: {
      origin: "http://localhost:3000",
      "access-control-request-method": "GET"
    }
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], "http://localhost:3000");
});

test("WhatsApp webhook verification accepts only the configured token", async () => {
  const accepted = await app.inject({
    method: "GET",
    url: "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-whatsapp-verify-token&hub.challenge=lovelydent-challenge"
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.body, "lovelydent-challenge");

  const rejected = await app.inject({
    method: "GET",
    url: "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=lovelydent-challenge"
  });
  assert.equal(rejected.statusCode, 401);
});

test("WhatsApp webhook rejects forged payloads and accepts a valid signature", async () => {
  const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const signature = `sha256=${createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
    .update(payload)
    .digest("hex")}`;

  const accepted = await app.inject({
    method: "POST",
    url: "/api/webhooks/whatsapp",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signature
    },
    payload
  });
  assert.equal(accepted.statusCode, 200);

  const rejected = await app.inject({
    method: "POST",
    url: "/api/webhooks/whatsapp",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": "sha256=forged"
    },
    payload
  });
  assert.equal(rejected.statusCode, 401);
});

test("observability endpoints require authentication", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/observability/metrics"
  });

  assert.equal(response.statusCode, 401);
});

test("obsolete unauthenticated clinic creation route is not exposed", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/create-clinic",
    payload: { name: "Unauthorized clinic" }
  });

  assert.equal(response.statusCode, 404);
});

test("administrator bootstrap attempts are rate limited", async () => {
  const payload = {
    setupKey: "definitely-the-wrong-setup-key",
    clinicName: "Security Test Clinic",
    email: "admin@example.com",
    password: "StrongPassword123!"
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-admin",
      payload
    });
    assert.equal(response.statusCode, 403);
  }

  const blockedResponse = await app.inject({
    method: "POST",
    url: "/api/auth/bootstrap-admin",
    payload
  });
  assert.equal(blockedResponse.statusCode, 429);
});
