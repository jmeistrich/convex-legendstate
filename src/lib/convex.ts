import {
  SyncedSubscribeParams,
  type SyncedGetParams,
} from "@legendapp/state/sync";
import {
  CrudAsOption,
  SyncedCrudPropsBase,
  SyncedCrudPropsMany,
  SyncedCrudReturnType,
  syncedCrud,
} from "@legendapp/state/sync-plugins/crud";

import { ConvexClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";

interface SyncedConvexProps<
  Client extends ConvexClient | ConvexReactClient,
  Query extends FunctionReference<"query", "public", any, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { localId: string } = Query["_returnType"][number],
> extends SyncedCrudPropsMany<TRemote, TRemote, TOption>,
    Omit<
      SyncedCrudPropsBase<TRemote, TRemote>,
      "retry" | "create" | "update" | "delete" | "fieldCreatedAt" | "fieldId"
    > {
  convex: Client;
  query: Query;
  queryArgs?: FunctionArgs<Query>;
  create?: FunctionReference<"mutation", "public", NoInfer<TRemote>>;
  update?: FunctionReference<
    "mutation",
    "public",
    NoInfer<Partial<TRemote> & { localId: string }>
  >;
  delete?: FunctionReference<
    "mutation",
    "public",
    NoInfer<{ localId: string }>
  >;
}

export function syncedConvex<
  Client extends ConvexClient | ConvexReactClient,
  Query extends FunctionReference<"query", "public", any, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { localId: string } = Query["_returnType"][number],
>(
  props: SyncedConvexProps<Client, Query, TOption, TRemote>,
): SyncedCrudReturnType<TRemote, TOption> {
  const {
    convex,
    query,
    queryArgs = {},
    create: createParam,
    update: updateParam,
    delete: deleteParam,
    // changesSince,
    generateId,
    mode,
    ...rest
  } = props;

  // If using last-sync mode then put it into soft delete mode
  //   const fieldUpdatedAt =
  //     fieldUpdatedAtParam ||
  //     (changesSince === "last-sync" ? "updated_at" : undefined);
  //   const fieldDeleted =
  //     fieldDeletedParam || (changesSince === "last-sync" ? "deleted" : undefined);

  const subscribe = (params: SyncedSubscribeParams<TRemote[]>) => {
    if ((convex as ConvexReactClient).watchQuery) {
      console.log("subscribe");
      const convexReactClient = convex as ConvexReactClient;
      const watch = convexReactClient.watchQuery(query, queryArgs);
      return watch.onUpdate(() => {
        // It's okay to just refresh() since we're guaranteed that the subsequent
        // `list` will read from the local cache.
        params.refresh();
      });
    } else {
      return (convex as ConvexClient)?.onUpdate(query, queryArgs, (result) => {
        params.update({
          value: result,
        });
      });
    }
  };

  const list = async (params: SyncedGetParams<TRemote>) => {
    const results = await convex.query(query, queryArgs);
    console.log("listed", results);
    return results;
  };

  return syncedCrud({
    ...rest,
    mode: mode || "set",
    list,
    create: async (input: TRemote) => {
      if (createParam) {
        const result = await convex.mutation(createParam, input);
        console.log("create", input, result);
        return result;
      }
    },
    update: async (input: Partial<TRemote> & { localId: string }) => {
      if (updateParam) {
        const result = await convex.mutation(updateParam, input);
        console.log("update", input, result);
        return result;
      }
    },
    delete: async (input: { localId: string }) => {
      if (deleteParam) {
        const result = await convex.mutation(deleteParam, input);
        console.log("delete", input, result);
        return result;
      }
    },
    fieldCreatedAt: "_creationTime",
    // fieldUpdatedAt,
    // fieldDeleted,
    updatePartial: false,
    fieldId: "localId",
    subscribe,
    generateId,
  });
}
