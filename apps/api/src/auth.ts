import type { Context, MiddlewareHandler } from "hono";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { ApiConfig } from "./config.js";

export type AuthUser = {
  sub: string;
  email: string | null;
  phone: string | null;
  groups: string[];
};

export type AppBindings = {
  Variables: {
    authUser: AuthUser;
  };
};

export function authMiddleware(config: ApiConfig): MiddlewareHandler<AppBindings> {
  const verifier =
    config.cognitoUserPoolId && config.cognitoAppClientId
      ? CognitoJwtVerifier.create({
          userPoolId: config.cognitoUserPoolId,
          tokenUse: "id",
          clientId: config.cognitoAppClientId,
        })
      : null;

  return async (c, next) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

    if (!verifier) {
      c.set("authUser", {
        sub: "local-dev-user",
        email: "dev@diaconia.local",
        phone: "+595000000000",
        groups: ["admin", "facilitator"],
      });
      await next();
      return;
    }

    if (!token) {
      return c.json({ error: "Missing bearer token" }, 401);
    }

    try {
      const payload = await verifier.verify(token);
      c.set("authUser", {
        sub: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        phone: typeof payload.phone_number === "string" ? payload.phone_number : null,
        groups: readGroups(payload["cognito:groups"]),
      });
      await next();
    } catch {
      return c.json({ error: "Invalid bearer token" }, 401);
    }
  };
}

export function requireAdmin(c: Context<AppBindings>) {
  const user = c.get("authUser");
  if (!user.groups.includes("admin")) {
    return c.json({ error: "Admin role required" }, 403);
  }

  return null;
}

function readGroups(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return [];
}
