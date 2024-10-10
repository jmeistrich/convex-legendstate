import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  messages: defineTable({
    localId: v.string(),
    localCreatedAt: v.number(),
    author: v.string(),
    body: v.string(),
  }).index("byLocalId", ["localId"]),
});
