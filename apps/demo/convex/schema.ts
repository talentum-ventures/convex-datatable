import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { presenceFields } from "../../../packages/datatable/src/convex/server";

export default defineSchema({
  deployments: defineTable({
    id: v.string(),
    deployment: v.string(),
    note: v.string(),
    monthlySpend: v.number(),
    status: v.string(),
    tags: v.array(v.string()),
    endpoint: v.string(),
    updatedAt: v.string(),
    deletedAt: v.union(v.number(), v.null())
  }).index("by_row_id", ["id"]),
  presence: defineTable(presenceFields).index("by_table_user", ["tableId", "userId"])
});
