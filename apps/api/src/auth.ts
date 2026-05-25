import { JwtRsaVerifier } from "aws-jwt-verify";
import type { MiddlewareHandler } from "hono";
import type { ApiConfig } from "./config.js";

export type AuthUser = {
  sub: string;
  email: string | null;
  phone: string | null;
};

export type AppBindings = {
  Variables: {
    authUser: AuthUser;
  };
};

type IdentityJwtPayload = {
  sub: string;
  email?: string;
  phone_number?: string;
  primary_email_address?: string;
};

export function authMiddleware(config: ApiConfig): MiddlewareHandler<AppBindings> {
  const verifier =
    config.clerkIssuer && config.clerkJwksUrl
      ? JwtRsaVerifier.create({
          issuer: config.clerkIssuer,
          jwksUri: config.clerkJwksUrl,
          audience: config.clerkAudience || null,
        } as never)
      : null;

  return async (c, next) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

    if (!verifier) {
      c.set("authUser", {
        sub: "local-dev-user",
        email: "dev@diaconia.local",
        phone: "+595000000000",
      });
      await next();
      return;
    }

    if (!token) {
      return c.json({ error: "Missing bearer token" }, 401);
    }

    try {
      const payload = (await verifier.verify(token)) as IdentityJwtPayload;
      c.set("authUser", {
        sub: payload.sub,
        email: payload.email ?? payload.primary_email_address ?? null,
        phone: payload.phone_number ?? null,
      });
      await next();
    } catch {
      return c.json({ error: "Invalid bearer token" }, 401);
    }
  };
}
