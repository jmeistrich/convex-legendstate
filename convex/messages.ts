import { Doc } from "./_generated/dataModel";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Infer, v } from "convex/values";

const localDocument = v.object({
  localId: v.string(),
  localCreatedAt: v.number(),
  serverCreatedAt: v.optional(v.number()),
  author: v.string(),
  body: v.string(),
});
type LocalDocument = Infer<typeof localDocument>;

function serverToLocalDocument(server: Doc<"messages">): LocalDocument {
  const { _id, _creationTime, ...rest } = server;
  return {
    serverCreatedAt: _creationTime,
    ...rest,
  };
}

export const list = query({
  args: {},
  returns: v.array(localDocument),
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    return messages.map(serverToLocalDocument);
  },
});

export const create = mutation({
  args: {
    localId: v.string(),
    localCreatedAt: v.number(),
    body: v.string(),
    author: v.string(),
  },
  returns: localDocument,
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (existing) {
      throw new Error(`Document ${args.localId} already exists.`);
    }
    const id = await ctx.db.insert("messages", args);
    const inserted = await ctx.db.get(id)!;
    return args;
  },
});

export const update = mutation({
  args: {
    localId: v.string(),
    localCreatedAt: v.optional(v.number()),
    body: v.optional(v.string()),
    author: v.optional(v.string()),
  },
  returns: localDocument,
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (!existing) {
      throw new Error(`Document ${args.localId} does not exist.`);
    }
    Object.assign(existing, args);
    await ctx.db.replace(existing._id, existing);
    return serverToLocalDocument(existing);
  },
});

export const remove = mutation({
  args: { localId: v.string() },
  returns: localDocument,
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (!existing) {
      throw new Error(`Document ${args.localId} does not exist.`);
    }
    await ctx.db.delete(existing._id);
    return serverToLocalDocument(existing);
  },
});

async function get(ctx: QueryCtx, localId: string) {
  return await ctx.db
    .query("messages")
    .withIndex("byLocalId", (q) => q.eq("localId", localId))
    .unique();
}
