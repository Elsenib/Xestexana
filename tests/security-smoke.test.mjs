import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/hospital_platform";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-only-jwt-secret-with-at-least-32-characters";
process.env.ADMIN_SETUP_KEY =
  process.env.ADMIN_SETUP_KEY ?? "test-only-private-admin-setup-key";

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
