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
  cognitoUserPoolId: string;
  cognitoAppClientId: string;
};

export function loadConfig(env = process.env): ApiConfig {
  return {
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL ?? defaultLocalDatabaseUrl,
    awsRegion: env.AWS_REGION ?? "sa-east-1",
    mediaBucketName: env.MEDIA_BUCKET_NAME ?? "diaconia-foundation-media-dev",
    cognitoUserPoolId: env.COGNITO_USER_POOL_ID ?? "",
    cognitoAppClientId: env.COGNITO_APP_CLIENT_ID ?? "",
  };
}

function loadEnvFile(path: string) {
  if (existsSync(path)) {
    loadDotenv({ path, override: false });
  }
}
