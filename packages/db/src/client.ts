import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

export function createDatabaseClient(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export function createDatabase(url = process.env.DATABASE_URL) {
  return createDatabaseClient(url).db;
}

export type Database = ReturnType<typeof createDatabase>;
