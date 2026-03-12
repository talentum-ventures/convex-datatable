import { useCallback, useEffect, useMemo, useRef } from "react";
import { Activity, DollarSign, Globe } from "lucide-react";
import { makeFunctionReference } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import {
  DataTable,
  DataTableContainer,
  useConvexDataSource,
  useConvexPresence,
  type ConvexPresenceEntry,
  type DataTableColumn,
  type DataTableFeatureFlags,
  type DataTableQueryState,
  type DataTableRowAction
} from "@talentum-ventures/convex-datatable";
import { z } from "zod";
import { getStoredConvexUser } from "./convex-user";
import { type ConvexDemoRow } from "./convex-data";

const CONVEX_TABLE_ID = "demo-convex-deployments";
const PRESENCE_STALE_AFTER_MS = 30_000;
const EMPTY_PRESENCE_ENTRIES: ReadonlyArray<ConvexPresenceEntry> = [];

const listDeploymentsRef = makeFunctionReference<
  "query",
  {
    cursor: string | null;
    pageSize: number;
    state: DataTableQueryState;
  },
  {
    rows: ReadonlyArray<ConvexDemoRow>;
    nextCursor: string | null;
  }
>("deployments:listPage");

const deploymentSummaryRef = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    activeCount: number;
    deletedCount: number;
  }
>("deployments:summary");

const ensureSeedRef = makeFunctionReference<"mutation", Record<string, never>, number>(
  "deployments:ensureSeed"
);

const createRowRef = makeFunctionReference<"mutation", Partial<ConvexDemoRow>, ConvexDemoRow>(
  "deployments:createRow"
);

const updateRowsRef = makeFunctionReference<
  "mutation",
  {
    changes: ReadonlyArray<{
      rowId: string;
      patch: Partial<ConvexDemoRow>;
    }>;
  },
  null
>("deployments:updateRows");

const deleteRowsRef = makeFunctionReference<
  "mutation",
  {
    rowIds: ReadonlyArray<string>;
  },
  null
>("deployments:deleteRows");

const restoreRowsRef = makeFunctionReference<
  "mutation",
  {
    rowIds: ReadonlyArray<string>;
  },
  null
>("deployments:restoreRows");

const getPresenceRef = makeFunctionReference<
  "query",
  {
    tableId: string;
    staleAfterMs?: number;
  },
  ReadonlyArray<ConvexPresenceEntry>
>("presence:getPresence");

const heartbeatRef = makeFunctionReference<"mutation", ConvexPresenceEntry, null>(
  "presence:heartbeat"
);

const clearStalePresenceRef = makeFunctionReference<
  "mutation",
  {
    tableId?: string;
    staleAfterMs?: number;
  },
  number
>("presence:clearStale");

type ConvexMutation<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

function useStableMutation<TArgs, TResult>(
  mutation: ConvexMutation<TArgs, TResult>
): ConvexMutation<TArgs, TResult> {
  const mutationRef = useRef(mutation);
  mutationRef.current = mutation;

  return useCallback((args: TArgs) => mutationRef.current(args), []);
}

function useConvexDeploymentsPage(args: {
  cursor: string | null;
  pageSize: number;
  state: DataTableQueryState;
}): {
  rows: ReadonlyArray<ConvexDemoRow>;
  nextCursor: string | null;
  status: "loading" | "loaded" | "error";
  error: string | null;
} {
  const page = useQuery(listDeploymentsRef, args);

  if (!page) {
    return {
      rows: [],
      nextCursor: null,
      status: "loading",
      error: null
    };
  }

  return {
    rows: page.rows,
    nextCursor: page.nextCursor,
    status: "loaded",
    error: null
  };
}

function useConvexPresenceEntries(tableId: string): ReadonlyArray<ConvexPresenceEntry> {
  return useQuery(getPresenceRef, {
    tableId,
    staleAfterMs: PRESENCE_STALE_AFTER_MS
  }) ?? EMPTY_PRESENCE_ENTRIES;
}

export function ConvexPage(): JSX.Element {
  const localUser = useMemo(() => getStoredConvexUser(), []);
  const ensureSeedMutation = useMutation(ensureSeedRef);
  const createRowMutation = useMutation(createRowRef);
  const updateRowsMutation = useMutation(updateRowsRef);
  const deleteRowsMutation = useMutation(deleteRowsRef);
  const restoreRowsMutation = useMutation(restoreRowsRef);
  const heartbeatMutation = useMutation(heartbeatRef);
  const clearStalePresenceMutation = useMutation(clearStalePresenceRef);
  const ensureSeed = useStableMutation(ensureSeedMutation);
  const createRow = useStableMutation(createRowMutation);
  const updateRows = useStableMutation(updateRowsMutation);
  const deleteRows = useStableMutation(deleteRowsMutation);
  const restoreRows = useStableMutation(restoreRowsMutation);
  const sendHeartbeat = useStableMutation(heartbeatMutation);
  const clearStalePresence = useStableMutation(clearStalePresenceMutation);
  const summary = useQuery(deploymentSummaryRef, {}) ?? {
    activeCount: 0,
    deletedCount: 0
  };

  useEffect(() => {
    void ensureSeed({});
    void clearStalePresence({
      tableId: CONVEX_TABLE_ID,
      staleAfterMs: PRESENCE_STALE_AFTER_MS
    });

    const intervalId = globalThis.setInterval(() => {
      void clearStalePresence({
        tableId: CONVEX_TABLE_ID,
        staleAfterMs: PRESENCE_STALE_AFTER_MS
      });
    }, PRESENCE_STALE_AFTER_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [clearStalePresence, ensureSeed]);

  const columns = useMemo<ReadonlyArray<DataTableColumn<ConvexDemoRow>>>(
    () => [
      {
        id: "deployment",
        field: "deployment",
        header: "Deployment",
        kind: "text",
        width: 220,
        isEditable: true
      },
      {
        id: "note",
        field: "note",
        header: "Note",
        kind: "longText",
        width: 300,
        isEditable: true
      },
      {
        id: "monthlySpend",
        field: "monthlySpend",
        header: "Monthly spend",
        kind: "currency",
        currency: "USD",
        width: 140,
        isEditable: true
      },
      {
        id: "status",
        field: "status",
        header: "Status",
        kind: "select",
        width: 140,
        isEditable: true,
        options: [
          {
            value: "draft",
            label: "Draft",
            colorClass: "bg-slate-100 text-slate-700"
          },
          {
            value: "live",
            label: "Live",
            colorClass: "bg-emerald-100 text-emerald-800"
          },
          {
            value: "paused",
            label: "Paused",
            colorClass: "bg-amber-100 text-amber-800"
          }
        ]
      },
      {
        id: "tags",
        field: "tags",
        header: "Tags",
        kind: "multiselect",
        width: 220,
        isEditable: true,
        options: [
          {
            value: "priority",
            label: "Priority",
            colorClass: "bg-rose-100 text-rose-700"
          },
          {
            value: "convex",
            label: "Convex",
            colorClass: "bg-cyan-100 text-cyan-700"
          },
          {
            value: "search",
            label: "Search",
            colorClass: "bg-sky-100 text-sky-700"
          },
          {
            value: "ops",
            label: "Ops",
            colorClass: "bg-violet-100 text-violet-700"
          },
          {
            value: "beta",
            label: "Beta",
            colorClass: "bg-lime-100 text-lime-700"
          }
        ]
      },
      {
        id: "endpoint",
        field: "endpoint",
        header: "Endpoint",
        kind: "link",
        width: 260,
        isEditable: true
      },
      {
        id: "updatedAt",
        field: "updatedAt",
        header: "Updated",
        kind: "date",
        width: 140,
        isEditable: true
      }
    ],
    []
  );

  const rowSchema = useMemo(
    () =>
      z.object({
        id: z.string(),
        deployment: z.string().min(1),
        note: z.string(),
        monthlySpend: z.number().min(0),
        status: z.string(),
        tags: z.array(z.string()),
        endpoint: z.string().url(),
        updatedAt: z.string()
      }),
    []
  );

  const rowActions = useMemo<ReadonlyArray<DataTableRowAction<ConvexDemoRow>>>(
    () => [
      {
        id: "inspect",
        label: "Inspect endpoint",
        onSelect: ({ row }) => {
          window.open(row.endpoint, "_blank", "noreferrer");
        }
      }
    ],
    []
  );

  const features = useMemo<DataTableFeatureFlags>(
    () => ({
      editing: true,
      rowAdd: true,
      rowDelete: true,
      clipboardPaste: true,
      cellSelect: true,
      infiniteScroll: true,
      virtualization: true,
      undo: true
    }),
    []
  );

  const createConvexRow = useCallback(
    async (draft: Partial<ConvexDemoRow>) => await createRow(draft),
    [createRow]
  );

  const updateConvexRows = useCallback(
    async (changes: ReadonlyArray<{ rowId: string; patch: Partial<ConvexDemoRow> }>) => {
      await updateRows({
        changes
      });
    },
    [updateRows]
  );

  const deleteConvexRows = useCallback(
    async (rowIds: ReadonlyArray<string>) => {
      await deleteRows({
        rowIds
      });
    },
    [deleteRows]
  );

  const restoreConvexRows = useCallback(
    async (rows: ReadonlyArray<ConvexDemoRow>) => {
      await restoreRows({
        rowIds: rows.map((row) => row.id)
      });
    },
    [restoreRows]
  );

  const dataSourceConfig = useMemo(
    () => ({
      tableId: CONVEX_TABLE_ID,
      pageSize: 12,
      usePageQuery: useConvexDeploymentsPage,
      createRow: createConvexRow,
      updateRows: updateConvexRows,
      deleteRows: deleteConvexRows,
      restoreRows: restoreConvexRows
    }),
    [createConvexRow, deleteConvexRows, restoreConvexRows, updateConvexRows]
  );

  const dataSource = useConvexDataSource<ConvexDemoRow>(dataSourceConfig);

  const getRowId = useCallback((row: ConvexDemoRow) => row.id, []);

  const theme = useMemo(
    () => ({
      activeCellRing: "hsl(174 72% 32%)",
      selectionBg: "hsl(181 71% 92%)"
    }),
    []
  );

  const presence = useConvexPresence({
    tableId: CONVEX_TABLE_ID,
    userId: localUser.userId,
    userName: localUser.userName,
    userColor: localUser.userColor,
    usePresenceData: useConvexPresenceEntries,
    sendHeartbeat: async (entry) => {
      await sendHeartbeat(entry);
    }
  });

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden sm:gap-5">
      <section className="space-y-2 sm:space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Convex adapter example
          </h2>
          <p className="hidden max-w-4xl text-sm text-slate-600 sm:block">
            This page is backed by a real Convex deployment for row paging, edits, soft deletes, and collaborative presence.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
              <Activity className="h-3.5 w-3.5 shrink-0 text-cyan-600 sm:h-4 sm:w-4" />
              <span className="truncate">Live rows</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">
              <span className="font-semibold text-slate-900">{summary.activeCount}</span>
              <span className="hidden sm:inline"> active deployment rows are loaded from Convex.</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
              <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
              <span className="truncate">Presence</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">
              <span className="font-semibold text-slate-900">{presence.collaborators.length}</span>
              <span className="hidden sm:inline"> collaborators are currently active. Open a second tab to see live cell presence.</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
              <DollarSign className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" />
              <span className="truncate">Deleted</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">
              <span className="font-semibold text-slate-900">{summary.deletedCount}</span>
              <span className="hidden sm:inline"> soft-deleted rows remain restorable in Convex.</span>
            </p>
          </div>
        </div>
      </section>

      <DataTableContainer>
        <DataTable<ConvexDemoRow>
          tableId={CONVEX_TABLE_ID}
          columns={columns}
          dataSource={dataSource}
          getRowId={getRowId}
          rowSchema={rowSchema}
          rowActions={rowActions}
          features={features}
          pageSize={12}
          collaborators={presence.collaborators}
          onActiveCellChange={presence.onActiveCellChange}
          theme={theme}
        />
      </DataTableContainer>
    </div>
  );
}
