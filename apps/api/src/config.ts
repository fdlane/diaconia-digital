import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadEnvFile(resolve(process.cwd(), "../../.env"));
loadEnvFile(resolve(process.cwd(), ".env"));

const defaultLocalDatabaseUrl = "postgres://postgres:postgres@localhost:5432/diaconia";

export type ApiConfig = {
  port: number;
  databaseUrl: string;
  awsRegion: string;
  mediaBucketName: string;
  clerkSecretKey: string;
  clerkJwtKey: string;
  clerkJwtAudience: string;
  clerkAuthorizedParties: string[];
  authDevBypass: boolean;
  authDevSubject: string;
  authDevPhone: string;
  allowedOrigins: string[];
};

export function loadConfig(env = process.env): ApiConfig {
  return {
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL ?? defaultLocalDatabaseUrl,
    awsRegion: env.AWS_REGION ?? "sa-east-1",
    mediaBucketName: env.MEDIA_BUCKET_NAME ?? "diaconia-foundation-media-dev",
    clerkSecretKey: env.CLERK_SECRET_KEY ?? "",
    clerkJwtKey: env.CLERK_JWT_KEY ?? "",
    clerkJwtAudience: env.CLERK_JWT_AUDIENCE ?? "diaconia-api",
    clerkAuthorizedParties: (env.CLERK_AUTHORIZED_PARTIES ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    authDevBypass: env.AUTH_DEV_BYPASS === "true" && env.NODE_ENV !== "production",
    authDevSubject: env.AUTH_DEV_SUBJECT ?? "local-dev-user",
    authDevPhone: env.AUTH_DEV_PHONE ?? "+595000000000",
    allowedOrigins: (
      env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:8081,http://localhost:19006"
    ).split(","),
  };
}

function loadEnvFile(path: string) {
  if (existsSync(path)) {
    loadDotenv({ path, override: false });
  }
}
