import type {
  DocumentByName,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  TableNamesInDataModel,
  WithoutSystemFields
} from "convex/server";
import { v, type GenericId } from "convex/values";
import type { ConvexPresenceEntry } from "../core/types";

const DEFAULT_PRESENCE_STALE_AFTER_MS = 30_000;

export const presenceFields = {
  tableId: v.string(),
  userId: v.string(),
  userName: v.string(),
  userColor: v.string(),
  activeRowId: v.union(v.string(), v.null()),
  activeColumnId: v.union(v.string(), v.null()),
  lastSeen: v.number()
} as const;

const presenceEntryValidator = v.object(presenceFields);
const getPresenceArgs = {
  tableId: v.string(),
  staleAfterMs: v.optional(v.number())
} as const;
const clearStalePresenceArgs = {
  tableId: v.optional(v.string()),
  staleAfterMs: v.optional(v.number())
} as const;

type PresenceDocument = ConvexPresenceEntry & {
  _id: GenericId<string>;
  _creationTime: number;
};

type PresenceTableName<DataModel extends GenericDataModel> = {
  [Name in TableNamesInDataModel<DataModel>]:
    DocumentByName<DataModel, Name> extends ConvexPresenceEntry
      ? ConvexPresenceEntry extends WithoutSystemFields<DocumentByName<DataModel, Name>>
        ? Name
        : never
      : never;
}[TableNamesInDataModel<DataModel>];

type PresenceTableDocument<
  DataModel extends GenericDataModel,
  TableName extends PresenceTableName<DataModel>
> = DocumentByName<DataModel, TableName> & PresenceDocument;

type PresenceTableInput<
  DataModel extends GenericDataModel,
  TableName extends PresenceTableName<DataModel>
> = WithoutSystemFields<PresenceTableDocument<DataModel, TableName>> & ConvexPresenceEntry;

function isActivePresenceEntry(entry: ConvexPresenceEntry, now: number, staleAfterMs: number): boolean {
  return now - entry.lastSeen <= staleAfterMs;
}

function isPresenceTableDocument<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>
>(
  value: DocumentByName<DataModel, TableName>
): value is PresenceTableDocument<DataModel, Extract<TableName, PresenceTableName<DataModel>>> {
  return (
    typeof value._id === "string" &&
    typeof value._creationTime === "number" &&
    typeof value.tableId === "string" &&
    typeof value.userId === "string" &&
    typeof value.userName === "string" &&
    typeof value.userColor === "string" &&
    (typeof value.activeRowId === "string" || value.activeRowId === null) &&
    (typeof value.activeColumnId === "string" || value.activeColumnId === null) &&
    typeof value.lastSeen === "number"
  );
}

export function heartbeatHandler<
  DataModel extends GenericDataModel,
  TableName extends PresenceTableName<DataModel>
>(tableName: TableName) {
  return {
    args: presenceFields,
    returns: v.null(),
    handler: async (
      ctx: GenericMutationCtx<DataModel>,
      args: PresenceTableInput<DataModel, TableName>
    ): Promise<null> => {
      const rows = (await ctx.db.query(tableName).collect()).filter(isPresenceTableDocument);
      const existing = rows.find(
        (entry) => entry.tableId === args.tableId && entry.userId === args.userId
      );

      if (existing) {
        await ctx.db.patch(existing._id, {
          userName: args.userName,
          userColor: args.userColor,
          activeRowId: args.activeRowId,
          activeColumnId: args.activeColumnId,
          lastSeen: args.lastSeen
        });
        return null;
      }

      await ctx.db.insert(tableName, args);
      return null;
    }
  };
}

export function getPresenceHandler<
  DataModel extends GenericDataModel,
  TableName extends PresenceTableName<DataModel>
>(tableName: TableName) {
  return {
    args: getPresenceArgs,
    returns: v.array(presenceEntryValidator),
    handler: async (
      ctx: GenericQueryCtx<DataModel>,
      args: { tableId: string; staleAfterMs?: number }
    ): Promise<ReadonlyArray<ConvexPresenceEntry>> => {
      const rows = (await ctx.db.query(tableName).collect()).filter(isPresenceTableDocument);
      const staleAfterMs = args.staleAfterMs ?? DEFAULT_PRESENCE_STALE_AFTER_MS;
      const now = Date.now();

      return rows
        .filter(
          (entry) =>
            entry.tableId === args.tableId && isActivePresenceEntry(entry, now, staleAfterMs)
        )
        .map((entry) => ({
          tableId: entry.tableId,
          userId: entry.userId,
          userName: entry.userName,
          userColor: entry.userColor,
          activeRowId: entry.activeRowId ?? null,
          activeColumnId: entry.activeColumnId ?? null,
          lastSeen: entry.lastSeen
        }));
    }
  };
}

export function clearStalePresenceHandler<
  DataModel extends GenericDataModel,
  TableName extends PresenceTableName<DataModel>
>(tableName: TableName) {
  return {
    args: clearStalePresenceArgs,
    returns: v.number(),
    handler: async (
      ctx: GenericMutationCtx<DataModel>,
      args: { tableId?: string; staleAfterMs?: number }
    ): Promise<number> => {
      const rows = (await ctx.db.query(tableName).collect()).filter(isPresenceTableDocument);
      const staleAfterMs = args.staleAfterMs ?? DEFAULT_PRESENCE_STALE_AFTER_MS;
      const now = Date.now();
      const staleRows = rows.filter((entry) => {
        if (args.tableId && entry.tableId !== args.tableId) {
          return false;
        }

        return !isActivePresenceEntry(entry, now, staleAfterMs);
      });

      for (const entry of staleRows) {
        await ctx.db.delete(entry._id);
      }

      return staleRows.length;
    }
  };
}
