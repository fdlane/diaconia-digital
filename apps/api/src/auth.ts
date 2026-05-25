import { verifyToken } from "@clerk/backend";
import { normalizePhoneNumber } from "@diaconia/shared";
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
  sub?: unknown;
  email?: unknown;
  email_address?: unknown;
  primary_email_address?: unknown;
  phone_number?: unknown;
};

export const authErrors = {
  missingToken: { code: "UNAUTHENTICATED", message: "Missing bearer token" },
  invalidToken: { code: "UNAUTHENTICATED", message: "Invalid bearer token" },
  missingConfig: {
    code: "AUTH_CONFIG_MISSING",
    message: "Missing Clerk verifier configuration",
  },
} as const;

function bearerToken(authorization: string | undefined) {
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function normalizeClaimPhone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return normalizePhoneNumber(value);
  } catch {
    return null;
  }
}

function normalizeClaimEmail(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (normalized.includes("@")) return normalized;
  }

  return null;
}

export function authMiddleware(config: ApiConfig): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const token = bearerToken(c.req.header("authorization"));

    if (config.authDevBypass) {
      c.set("authUser", {
        sub: config.authDevSubject,
        email: config.authDevEmail,
        phone: config.authDevPhone,
      });
      await next();
      return;
    }

    if (!token) {
      return c.json({ error: authErrors.missingToken.message, code: authErrors.missingToken.code }, 401);
    }

    if (!config.clerkSecretKey && !config.clerkJwtKey) {
      return c.json({ error: authErrors.missingConfig.message, code: authErrors.missingConfig.code }, 500);
    }

    try {
      const payload = (await verifyToken(token, {
        audience: config.clerkJwtAudience,
        authorizedParties: config.clerkAuthorizedParties.length ? config.clerkAuthorizedParties : undefined,
        jwtKey: config.clerkJwtKey || undefined,
        secretKey: config.clerkSecretKey || undefined,
      })) as IdentityJwtPayload;

      if (typeof payload.sub !== "string" || !payload.sub) {
        return c.json({ error: authErrors.invalidToken.message, code: authErrors.invalidToken.code }, 401);
      }

      c.set("authUser", {
        sub: payload.sub,
        email: normalizeClaimEmail(payload.email, payload.email_address, payload.primary_email_address),
        phone: normalizeClaimPhone(payload.phone_number),
      });
      await next();
    } catch {
      return c.json({ error: authErrors.invalidToken.message, code: authErrors.invalidToken.code }, 401);
    }
  };
}
