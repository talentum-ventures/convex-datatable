import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { type ConvexDemoRow } from "../src/convex-data";

type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "isEmpty"
  | "isNotEmpty";

type FilterValue = string | number | boolean | null | string[];

type QueryFilter = {
  columnId: string;
  op: FilterOperator;
  value: FilterValue;
};

type QueryState = {
  sorting: {
    columnId: string;
    direction: "asc" | "desc";
  }[];
  filters: QueryFilter[];
  pageSize: number;
  cursor: string | null;
};

const sortValidator = v.object({
  columnId: v.string(),
  direction: v.union(v.literal("asc"), v.literal("desc"))
});

const filterValidator = v.object({
  columnId: v.string(),
  op: v.union(
    v.literal("eq"),
    v.literal("neq"),
    v.literal("contains"),
    v.literal("startsWith"),
    v.literal("endsWith"),
    v.literal("gt"),
    v.literal("gte"),
    v.literal("lt"),
    v.literal("lte"),
    v.literal("in"),
    v.literal("isEmpty"),
    v.literal("isNotEmpty")
  ),
  value: v.union(v.string(), v.number(), v.boolean(), v.null(), v.array(v.string()))
});

const queryStateValidator = v.object({
  sorting: v.array(sortValidator),
  filters: v.array(filterValidator),
  pageSize: v.number(),
  cursor: v.union(v.string(), v.null())
});

const rowPatchValidator = v.object({
  deployment: v.optional(v.string()),
  note: v.optional(v.string()),
  monthlySpend: v.optional(v.number()),
  status: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  endpoint: v.optional(v.string()),
  updatedAt: v.optional(v.string())
});

type StoredDeploymentRow = ConvexDemoRow & {
  deletedAt: number | null;
};

const DEPLOYMENT_NAMES = [
  "Live Cache",
  "Edge Search",
  "Billing Sync",
  "Webhook Fanout",
  "Analytics Pipe",
  "Identity Mirror"
] as const;

const TEAMS = ["growth", "ops", "platform", "support"] as const;
const STATUSES = ["draft", "live", "paused"] as const;
const TAGS = ["priority", "convex", "search", "ops", "beta"] as const;

function toStoredRow(row: ConvexDemoRow): StoredDeploymentRow {
  return {
    ...row,
    deletedAt: null
  };
}

function toClientRow(row: StoredDeploymentRow): ConvexDemoRow {
  return {
    id: row.id,
    deployment: row.deployment,
    note: row.note,
    monthlySpend: row.monthlySpend,
    status: row.status,
    tags: [...row.tags],
    endpoint: row.endpoint,
    updatedAt: row.updatedAt
  };
}

function generateSeedRows(): ReadonlyArray<StoredDeploymentRow> {
  const rows: StoredDeploymentRow[] = [];

  for (let index = 1; index <= 48; index += 1) {
    const deploymentName = DEPLOYMENT_NAMES[(index - 1) % DEPLOYMENT_NAMES.length] ?? "Live Cache";
    const team = TEAMS[index % TEAMS.length] ?? "ops";
    const status = STATUSES[index % STATUSES.length] ?? "draft";
    const primaryTag = TAGS[index % TAGS.length] ?? "ops";
    const secondaryTag = TAGS[(index + 2) % TAGS.length] ?? "beta";

    rows.push({
      id: `deploy-${String(index).padStart(2, "0")}`,
      deployment: `${deploymentName} ${String(index).padStart(2, "0")}`,
      note:
        index % 2 === 0
          ? `Convex-backed deployment for ${team}. Mirrors paged queries and collaborative presence.`
          : `Review ${team} rollout ${index}.`,
      monthlySpend: 1800 + index * 147,
      status,
      tags: [primaryTag, secondaryTag],
      endpoint: `https://demo.convex.dev/deployments/${index}`,
      updatedAt: `2026-03-${String((index % 9) + 1).padStart(2, "0")}`,
      deletedAt: null
    });
  }

  return rows;
}

function encodeCursor(offset: number): string {
  return `offset:${String(Math.max(0, offset))}`;
}

function decodeCursor(cursor: string | null): number {
  if (!cursor?.startsWith("offset:")) {
    return 0;
  }

  const offset = Number.parseInt(cursor.slice("offset:".length), 10);
  if (!Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return offset;
}

function compareValues(left: string | number | boolean | null, right: string | number | boolean | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function stringifyValue(value: ConvexDemoRow[keyof ConvexDemoRow]): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

function comparableValue(value: ConvexDemoRow[keyof ConvexDemoRow]): string | number | boolean | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function isCellEmpty(value: ConvexDemoRow[keyof ConvexDemoRow]): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

function matchesFilter(row: ConvexDemoRow, filter: QueryFilter): boolean {
  const raw = row[filter.columnId as keyof ConvexDemoRow];
  const text = stringifyValue(raw);

  if (filter.op === "isEmpty") {
    return isCellEmpty(raw);
  }

  if (filter.op === "isNotEmpty") {
    return !isCellEmpty(raw);
  }

  if (filter.op === "contains") {
    return text.toLowerCase().includes(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "startsWith") {
    return text.toLowerCase().startsWith(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "endsWith") {
    return text.toLowerCase().endsWith(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "eq") {
    return text === String(filter.value ?? "");
  }

  if (filter.op === "neq") {
    return text !== String(filter.value ?? "");
  }

  if (filter.op === "in") {
    const filterValues = filter.value;
    if (!Array.isArray(filterValues)) {
      return false;
    }

    if (Array.isArray(raw)) {
      return raw.some((entry) => filterValues.includes(entry));
    }

    return filterValues.includes(text);
  }

  if (filter.op === "gt" || filter.op === "gte" || filter.op === "lt" || filter.op === "lte") {
    const numericRaw = Number(text);
    const numericFilter = Number(filter.value);
    if (Number.isNaN(numericRaw) || Number.isNaN(numericFilter)) {
      return false;
    }

    if (filter.op === "gt") {
      return numericRaw > numericFilter;
    }
    if (filter.op === "gte") {
      return numericRaw >= numericFilter;
    }
    if (filter.op === "lt") {
      return numericRaw < numericFilter;
    }

    return numericRaw <= numericFilter;
  }

  return true;
}

function queryDeploymentRows(args: {
  rows: ReadonlyArray<ConvexDemoRow>;
  state: QueryState;
  cursor: string | null;
  pageSize: number;
}): {
  rows: ConvexDemoRow[];
  nextCursor: string | null;
} {
  let output = [...args.rows];

  for (const filter of args.state.filters) {
    output = output.filter((row) => matchesFilter(row, filter));
  }

  const sortEntry = args.state.sorting[0];
  if (sortEntry) {
    output.sort((left, right) => {
      const leftValue = left[sortEntry.columnId as keyof ConvexDemoRow];
      const rightValue = right[sortEntry.columnId as keyof ConvexDemoRow];
      const result = compareValues(comparableValue(leftValue), comparableValue(rightValue));
      return sortEntry.direction === "asc" ? result : -result;
    });
  }

  const start = decodeCursor(args.cursor);
  const end = start + Math.max(1, args.pageSize);

  return {
    rows: output.slice(start, end),
    nextCursor: end < output.length ? encodeCursor(end) : null
  };
}

export const ensureSeed = mutationGeneric({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const existingRows = await ctx.db.query("deployments").collect();
    if (existingRows.length > 0) {
      return existingRows.length;
    }

    const seedRows = generateSeedRows();
    for (const row of seedRows) {
      await ctx.db.insert("deployments", row);
    }

    return seedRows.length;
  }
});

export const listPage = queryGeneric({
  args: {
    cursor: v.union(v.string(), v.null()),
    pageSize: v.number(),
    state: queryStateValidator
  },
  returns: v.object({
    rows: v.array(
      v.object({
        id: v.string(),
        deployment: v.string(),
        note: v.string(),
        monthlySpend: v.number(),
        status: v.string(),
        tags: v.array(v.string()),
        endpoint: v.string(),
        updatedAt: v.string()
      })
    ),
    nextCursor: v.union(v.string(), v.null())
  }),
  handler: async (ctx, args): Promise<{ rows: ConvexDemoRow[]; nextCursor: string | null }> => {
    const rows = await ctx.db.query("deployments").collect();
    const activeRows = rows.filter((row) => row.deletedAt === null).map(toClientRow);

    return queryDeploymentRows({
      rows: activeRows,
      state: args.state,
      cursor: args.cursor,
      pageSize: args.pageSize
    });
  }
});

export const summary = queryGeneric({
  args: {},
  returns: v.object({
    activeCount: v.number(),
    deletedCount: v.number()
  }),
  handler: async (ctx): Promise<{ activeCount: number; deletedCount: number }> => {
    const rows = await ctx.db.query("deployments").collect();

    return {
      activeCount: rows.filter((row) => row.deletedAt === null).length,
      deletedCount: rows.filter((row) => row.deletedAt !== null).length
    };
  }
});

export const createRow = mutationGeneric({
  args: rowPatchValidator,
  returns: v.object({
    id: v.string(),
    deployment: v.string(),
    note: v.string(),
    monthlySpend: v.number(),
    status: v.string(),
    tags: v.array(v.string()),
    endpoint: v.string(),
    updatedAt: v.string()
  }),
  handler: async (ctx, draft): Promise<ConvexDemoRow> => {
    const nextRow: ConvexDemoRow = {
      id: `deploy-${crypto.randomUUID().slice(0, 8)}`,
      deployment: draft.deployment ?? "Fresh Deployment",
      note: draft.note ?? "Queued from the real Convex adapter demo.",
      monthlySpend: draft.monthlySpend ?? 2400,
      status: draft.status ?? "draft",
      tags: draft.tags ?? ["convex"],
      endpoint: draft.endpoint ?? "https://demo.convex.dev/deployments/new",
      updatedAt: draft.updatedAt ?? "2026-03-10"
    };

    await ctx.db.insert("deployments", toStoredRow(nextRow));
    return nextRow;
  }
});

export const updateRows = mutationGeneric({
  args: {
    changes: v.array(
      v.object({
        rowId: v.string(),
        patch: rowPatchValidator
      })
    )
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const rows = await ctx.db.query("deployments").collect();

    for (const change of args.changes) {
      const existingRow = rows.find((row) => row.id === change.rowId);
      if (!existingRow) {
        continue;
      }

      await ctx.db.patch(existingRow._id, change.patch);
    }

    return null;
  }
});

export const deleteRows = mutationGeneric({
  args: {
    rowIds: v.array(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const rows = await ctx.db.query("deployments").collect();
    const now = Date.now();

    for (const rowId of args.rowIds) {
      const existingRow = rows.find((row) => row.id === rowId);
      if (!existingRow) {
        continue;
      }

      await ctx.db.patch(existingRow._id, {
        deletedAt: now
      });
    }

    return null;
  }
});

export const restoreRows = mutationGeneric({
  args: {
    rowIds: v.array(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const rows = await ctx.db.query("deployments").collect();

    for (const rowId of args.rowIds) {
      const existingRow = rows.find((row) => row.id === rowId);
      if (!existingRow) {
        continue;
      }

      await ctx.db.patch(existingRow._id, {
        deletedAt: null
      });
    }

    return null;
  }
});
