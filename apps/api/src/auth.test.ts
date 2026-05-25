import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware, type AppBindings } from "./auth.js";
import type { ApiConfig } from "./config.js";

const verifyToken = vi.fn();

vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyToken(...args),
}));

function config(overrides: Partial<ApiConfig> = {}): ApiConfig {
  return {
    port: 4000,
    databaseUrl: "postgres://example",
    awsRegion: "sa-east-1",
    mediaBucketName: "test-bucket",
    clerkSecretKey: "sk_test",
    clerkJwtKey: "",
    clerkJwtAudience: "diaconia-api",
    clerkAuthorizedParties: ["http://localhost:3000"],
    authDevBypass: false,
    authDevSubject: "local-dev-user",
    authDevEmail: null,
    authDevPhone: "+595000000000",
    allowedOrigins: ["http://localhost:3000"],
    ...overrides,
  };
}

function appWithAuth(overrides: Partial<ApiConfig> = {}) {
  const app = new Hono<AppBindings>();
  app.use("*", authMiddleware(config(overrides)));
  app.get("/protected", (c) => c.json(c.get("authUser")));
  return app;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    verifyToken.mockReset();
  });

  it("rejects missing bearer tokens unless dev bypass is explicit", async () => {
    const response = await appWithAuth().request("/protected");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("uses the explicit local dev identity when dev bypass is enabled", async () => {
    const response = await appWithAuth({ authDevBypass: true }).request("/protected");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sub: "local-dev-user",
      email: null,
      phone: "+595000000000",
    });
  });

  it("fails closed when Clerk verifier configuration is missing", async () => {
    const response = await appWithAuth({ clerkSecretKey: "", clerkJwtKey: "" }).request("/protected", {
      headers: { authorization: "Bearer token" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_CONFIG_MISSING" });
  });

  it("verifies Clerk JWTs with the configured audience and authorized parties", async () => {
    verifyToken.mockResolvedValue({
      sub: "user_123",
      email: "ADMIN@DIACONIA.LOCAL",
      phone_number: "0981000000",
    });

    const response = await appWithAuth().request("/protected", {
      headers: { authorization: "Bearer token" },
    });

    expect(response.status).toBe(200);
    expect(verifyToken).toHaveBeenCalledWith("token", {
      audience: "diaconia-api",
      authorizedParties: ["http://localhost:3000"],
      jwtKey: undefined,
      secretKey: "sk_test",
    });
    await expect(response.json()).resolves.toEqual({
      sub: "user_123",
      email: "admin@diaconia.local",
      phone: "+595981000000",
    });
  });

  it("rejects invalid Clerk JWTs", async () => {
    verifyToken.mockRejectedValue(new Error("bad token"));

    const response = await appWithAuth().request("/protected", {
      headers: { authorization: "Bearer token" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
