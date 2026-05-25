import { handleGetQueriesRequest, PushProcessor } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/drizzle-pg";
import type { ReadonlyJSONValue } from "@rocicorp/zero";
import type { Database } from "../client.js";
import type { ZeroAuthContext } from "./context.js";
import { zeroMutators } from "./mutators.js";
import { zeroQueries } from "./queries.js";
import { schema } from "./schema.js";

export type { ZeroAuthContext } from "./context.js";

export function createZeroSyncHandlers(db: Database) {
  const dbProvider = zeroNodePg(schema, db as never);
  const pushProcessor = new PushProcessor(dbProvider);

  return {
    query(context: ZeroAuthContext, request: Request | ReadonlyJSONValue) {
      return handleGetQueriesRequest((name, args) => {
        const query = zeroQueries[name];
        if (!query) {
          throw new Error(`Unknown Zero query: ${name}`);
        }

        return { query: query(context, args) };
      }, schema, request);
    },
    mutate(request: Request) {
      return pushProcessor.process(zeroMutators, request);
    },
  };
}

