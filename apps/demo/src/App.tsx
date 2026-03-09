import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Globe, Layers } from "lucide-react";
import {
  DataTable,
  DataTableContainer,
  type DataTableColumn,
  type DataTableDataSource,
  type DataTableRowAction,
  type DataTableQueryState
} from "@rolha/datatable";
import { z } from "zod";
import { applyServerQuery } from "./demo-query";

type DemoRow = {
  id: string;
  name: string;
  description: string;
  amount: number;
  status: string;
  tags: ReadonlyArray<string>;
  website: string;
  createdAt: string;
  meta: string;
};

type DemoDebugScalar = string | number | boolean | null;

type DemoDebugEvent = {
  ts: string;
  scope: string;
  message: string;
  details: Readonly<Record<string, DemoDebugScalar>>;
};

const DEMO_DEBUG_PARAM = "dt_debug";
const DEMO_DEBUG_FLAG_STORAGE = "rolha-grid:debug";
const DEMO_DEBUG_EVENTS_STORAGE = "rolha-grid:debug:events";
const DEMO_DEBUG_MAX_EVENTS = 600;
const demoThrottledEvents: Record<string, number> = {};

function isDemoDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const queryFlag = params.get(DEMO_DEBUG_PARAM);

  if (queryFlag === "1") {
    try {
      window.localStorage.setItem(DEMO_DEBUG_FLAG_STORAGE, "1");
    } catch {
      // ignore storage failures when enabling debug
    }
    return true;
  }

  if (queryFlag === "0") {
    try {
      window.localStorage.removeItem(DEMO_DEBUG_FLAG_STORAGE);
    } catch {
      // ignore storage failures when disabling debug
    }
    return false;
  }

  try {
    return window.localStorage.getItem(DEMO_DEBUG_FLAG_STORAGE) === "1";
  } catch {
    return false;
  }
}

function readDemoDebugEvents(): ReadonlyArray<DemoDebugEvent> {
  if (typeof window === "undefined") {
    return [];
  }

  let raw = "";
  try {
    raw = window.localStorage.getItem(DEMO_DEBUG_EVENTS_STORAGE) ?? "";
  } catch {
    return [];
  }

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ReadonlyArray<DemoDebugEvent>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoDebugEvents(events: ReadonlyArray<DemoDebugEvent>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_DEBUG_EVENTS_STORAGE, JSON.stringify(events));
  } catch {
    // ignore storage failures during debug writes
  }
}

function clearDemoDebugEvents(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(DEMO_DEBUG_EVENTS_STORAGE);
  } catch {
    // ignore storage failures while clearing debug events
  }
}

function pushDemoDebugEvent(
  scope: string,
  message: string,
  details: Readonly<Record<string, DemoDebugScalar>> = {}
): void {
  if (!isDemoDebugEnabled()) {
    return;
  }

  const nextEvent: DemoDebugEvent = {
    ts: new Date().toISOString(),
    scope,
    message,
    details
  };

  const events = [...readDemoDebugEvents(), nextEvent];
  if (events.length > DEMO_DEBUG_MAX_EVENTS) {
    events.splice(0, events.length - DEMO_DEBUG_MAX_EVENTS);
  }
  writeDemoDebugEvents(events);
}

function pushDemoDebugEventThrottled(
  scope: string,
  key: string,
  minIntervalMs: number,
  message: string,
  details: Readonly<Record<string, DemoDebugScalar>> = {}
): void {
  if (!isDemoDebugEnabled()) {
    return;
  }

  const composite = `${scope}:${key}`;
  const now = Date.now();
  const last = demoThrottledEvents[composite] ?? 0;
  if (now - last < minIntervalMs) {
    return;
  }

  demoThrottledEvents[composite] = now;
  pushDemoDebugEvent(scope, message, details);
}

function generateRows(): ReadonlyArray<DemoRow> {
  const statuses = ["todo", "in_progress", "done"] as const;
  const tags = ["urgent", "design", "backend", "ops", "qa"] as const;

  const output: DemoRow[] = [];

  for (let index = 1; index <= 180; index += 1) {
    const status = statuses[index % statuses.length] ?? "todo";
    const rowTags = [tags[index % tags.length] ?? "ops", tags[(index + 2) % tags.length] ?? "qa"];

    output.push({
      id: String(index),
      name: `Project ${index}`,
      description:
        index % 2 === 0
          ? `Long note for project ${index}. This row wraps and increases row content minimum height.`
          : `Short note ${index}`,
      amount: 1000 + index * 9.35,
      status,
      tags: rowTags,
      website: `https://example.com/projects/${index}`,
      createdAt: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      meta: `#${index}`
    });
  }

  return output;
}

function queryCacheKey(state: DataTableQueryState): string {
  const sortingPart = state.sorting
    .map((entry) => `${entry.columnId}.${entry.direction}`)
    .join("|");

  const filtersPart = state.filters
    .map((entry) => {
      const value = Array.isArray(entry.value) ? entry.value.join("~") : String(entry.value);
      return `${entry.columnId}.${entry.op}.${value}`;
    })
    .join("|");

  return `${sortingPart}::${filtersPart}::${state.pageSize}::${state.cursor ?? ""}`;
}

function formatDebugEvent(entry: DemoDebugEvent): string {
  const details = Object.entries(entry.details)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  return `${entry.ts} [${entry.scope}] ${entry.message}${details.length > 0 ? ` ${details}` : ""}`;
}

export function App(): JSX.Element {
  const isDebugMode = useMemo(() => isDemoDebugEnabled(), []);
  const [rows, setRows] = useState<ReadonlyArray<DemoRow>>(generateRows());
  const [softDeleted, setSoftDeleted] = useState<Record<string, DemoRow>>({});
  const [limit, setLimit] = useState(50);
  const [debugEvents, setDebugEvents] = useState<ReadonlyArray<DemoDebugEvent>>([]);
  const queryCacheRef = useRef<{
    queryKey: string;
    rowsRef: ReadonlyArray<DemoRow>;
    projected: ReadonlyArray<DemoRow>;
  } | null>(null);
  const rowsResultCacheRef = useRef<{
    queryKey: string;
    limit: number;
    rowsRef: ReadonlyArray<DemoRow>;
    projectedRef: ReadonlyArray<DemoRow>;
    result: {
      rows: ReadonlyArray<DemoRow>;
      hasMore: boolean;
      isLoading: boolean;
      isLoadingMore: boolean;
      error: string | null;
      loadMore: () => void;
      refresh: () => void;
    };
  } | null>(null);

  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

    pushDemoDebugEvent("demo", "debug mode enabled", {
      rows: rows.length,
      limit
    });

    const onError = (event: ErrorEvent): void => {
      pushDemoDebugEvent("demo", "window error", {
        message: event.message,
        source: event.filename || "unknown",
        line: event.lineno,
        column: event.colno
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      pushDemoDebugEvent("demo", "unhandled rejection", {
        reason: String(event.reason)
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    let rafId = 0;
    let lastFrameTime = performance.now();
    const frameProbe = (now: number): void => {
      const delta = now - lastFrameTime;
      if (delta > 900) {
        pushDemoDebugEventThrottled("demo", "frame-stall", 1000, "main thread frame stall", {
          stallMs: Math.round(delta)
        });
      }
      lastFrameTime = now;
      rafId = window.requestAnimationFrame(frameProbe);
    };
    rafId = window.requestAnimationFrame(frameProbe);

    let longTaskObserver: PerformanceObserver | null = null;
    if (typeof window.PerformanceObserver !== "undefined") {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration < 100) {
              continue;
            }
            pushDemoDebugEventThrottled("demo", "long-task", 300, "long task detected", {
              durationMs: Math.round(entry.duration),
              name: entry.name || "task"
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch {
        longTaskObserver = null;
      }
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.cancelAnimationFrame(rafId);
      longTaskObserver?.disconnect();
    };
  }, [isDebugMode, limit, rows.length]);

  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

    setDebugEvents(readDemoDebugEvents());
    const intervalId = window.setInterval(() => {
      setDebugEvents(readDemoDebugEvents());
    }, 600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isDebugMode]);

  const columns = useMemo<ReadonlyArray<DataTableColumn<DemoRow>>>(
    () => [
      {
        id: "name",
        field: "name",
        header: "Project",
        kind: "text",
        width: 180,
        isEditable: true,
        validator: (value) => (value.trim().length > 0 ? null : "Project name is required")
      },
      {
        id: "description",
        field: "description",
        header: "Description",
        kind: "longText",
        width: 260,
        isEditable: true
      },
      {
        id: "amount",
        field: "amount",
        header: "Budget",
        kind: "currency",
        currency: "USD",
        width: 120,
        isEditable: true,
        validator: (value) => (value >= 0 ? null : "Budget cannot be negative")
      },
      {
        id: "status",
        field: "status",
        header: "Status",
        kind: "select",
        width: 150,
        isEditable: true,
        options: [
          {
            value: "todo",
            label: "To do",
            colorClass: "bg-amber-100 text-amber-800",
            icon: Flag
          },
          {
            value: "in_progress",
            label: "In progress",
            colorClass: "bg-sky-100 text-sky-800",
            icon: Layers
          },
          {
            value: "done",
            label: "Done",
            colorClass: "bg-emerald-100 text-emerald-800",
            icon: Globe
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
            value: "urgent",
            label: "Urgent",
            colorClass: "bg-rose-100 text-rose-700"
          },
          {
            value: "design",
            label: "Design",
            colorClass: "bg-violet-100 text-violet-700"
          },
          {
            value: "backend",
            label: "Backend",
            colorClass: "bg-slate-100 text-slate-700"
          },
          {
            value: "ops",
            label: "Ops",
            colorClass: "bg-cyan-100 text-cyan-700"
          },
          {
            value: "qa",
            label: "QA",
            colorClass: "bg-lime-100 text-lime-700"
          }
        ]
      },
      {
        id: "website",
        field: "website",
        header: "Website",
        kind: "link",
        width: 260,
        isEditable: true
      },
      {
        id: "createdAt",
        field: "createdAt",
        header: "Created",
        kind: "date",
        width: 140,
        isEditable: true
      },
      {
        id: "meta",
        field: "meta",
        header: "Meta",
        kind: "reactNode",
        width: 120,
        isEditable: true,
        renderCell: ({ value }) => <>{value}</>,
        renderEditor: ({ value, commit, cancel }) => (
          <input
            autoFocus
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            defaultValue={String(value)}
            onBlur={(event) => {
              commit(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancel();
              }
              if (event.key === "Enter") {
                commit(event.currentTarget.value);
              }
            }}
          />
        ),
        parseInput: (input) => input,
        parseClipboard: (text) => text,
        serializeClipboard: (value) => String(value)
      }
    ],
    []
  );

  const rowSchema = useMemo(
    () =>
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string(),
        amount: z.number().min(0),
        status: z.string(),
        tags: z.array(z.string()),
        website: z.string().url(),
        createdAt: z.string(),
        meta: z.string()
      }),
    []
  );

  const rowActions = useMemo<ReadonlyArray<DataTableRowAction<DemoRow>>>(
    () => [
      {
        id: "open",
        label: "Open",
        onSelect: ({ row }) => {
          window.open(row.website, "_blank", "noreferrer");
        }
      }
    ],
    []
  );

  const features = useMemo(
    () => ({
      editing: true,
      rowAdd: true,
      rowDelete: true,
      clipboardPaste: true,
      cellSelect: true,
      rowResize: false,
      virtualization: true,
      undo: true
    }),
    []
  );

  const theme = useMemo(
    () => ({
      activeCellRing: "hsl(200 100% 42%)",
      selectionBg: "hsl(200 80% 93%)"
    }),
    []
  );

  const dataSource = useMemo<DataTableDataSource<DemoRow>>(
    () => ({
      useRows: (query) => {
        const queryKey = queryCacheKey(query);
        const cache = queryCacheRef.current;
        const projected =
          cache && cache.queryKey === queryKey && cache.rowsRef === rows
            ? cache.projected
            : applyServerQuery(rows, query);

        if (!cache || cache.queryKey !== queryKey || cache.rowsRef !== rows) {
          queryCacheRef.current = {
            queryKey,
            rowsRef: rows,
            projected
          };
        }

        const rowsResultCache = rowsResultCacheRef.current;
        if (
          rowsResultCache &&
          rowsResultCache.queryKey === queryKey &&
          rowsResultCache.limit === limit &&
          rowsResultCache.rowsRef === rows &&
          rowsResultCache.projectedRef === projected
        ) {
          return rowsResultCache.result;
        }

        const scoped = projected.length <= limit ? projected : projected.slice(0, limit);

        const result = {
          rows: scoped,
          hasMore: projected.length > scoped.length,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          loadMore: () => {
            setLimit((current) => current + query.pageSize);
          },
          refresh: () => {
            setLimit(50);
          }
        };

        rowsResultCacheRef.current = {
          queryKey,
          limit,
          rowsRef: rows,
          projectedRef: projected,
          result
        };

        return result;
      },
      createRow: async (draft) => {
        const newRow: DemoRow = {
          id: crypto.randomUUID(),
          name: String(draft.name ?? "Untitled"),
          description: String(draft.description ?? ""),
          amount: Number(draft.amount ?? 0),
          status: String(draft.status ?? "todo"),
          tags: Array.isArray(draft.tags)
            ? draft.tags.map((entry) => String(entry))
            : [],
          website: String(draft.website ?? "https://example.com"),
          createdAt: String(draft.createdAt ?? "2026-03-05"),
          meta: "new"
        };

        setRows((current) => [newRow, ...current]);
        return newRow;
      },
      updateRows: async (changes) => {
        setRows((current) => {
          const patchMap = new Map<string, Partial<DemoRow>>();
          for (const change of changes) {
            patchMap.set(change.rowId, change.patch);
          }

          return current.map((row) => {
            const patch = patchMap.get(row.id);
            if (!patch) {
              return row;
            }
            return {
              ...row,
              ...patch
            };
          });
        });
      },
      deleteRows: async (rowIds) => {
        setRows((current) => {
          const removed: Record<string, DemoRow> = {};
          const remaining = current.filter((row) => {
            if (rowIds.includes(row.id)) {
              removed[row.id] = row;
              return false;
            }
            return true;
          });
          setSoftDeleted((currentDeleted) => ({ ...currentDeleted, ...removed }));
          return remaining;
        });
      },
      restoreRows: async (deletedRows) => {
        setRows((current) => [...deletedRows, ...current]);
        setSoftDeleted((current) => {
          const next = { ...current };
          for (const row of deletedRows) {
            delete next[row.id];
          }
          return next;
        });
      }
    }),
    [limit, rows]
  );

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Rolha Grid</h1>
        <p className="max-w-4xl text-sm text-slate-600">
          Fully type-safe AG Grid-inspired datatable powered by TanStack internals, themed with shadcn-style UI and designed for Convex adapters.
        </p>
        <p className="text-xs text-slate-500">Soft deleted rows in memory: {Object.keys(softDeleted).length}</p>
      </section>

      <DataTableContainer>
        <DataTable<DemoRow>
          tableId="demo-projects"
          columns={columns}
          dataSource={dataSource}
          getRowId={(row) => row.id}
          rowSchema={rowSchema}
          rowActions={rowActions}
          features={features}
          theme={theme}
        />
      </DataTableContainer>
      {isDebugMode ? (
        <section className="rounded-xl border border-slate-300 bg-white/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={() => {
                setDebugEvents(readDemoDebugEvents());
              }}
            >
              Refresh logs
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={() => {
                clearDemoDebugEvents();
                setDebugEvents([]);
              }}
            >
              Clear logs
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={() => {
                pushDemoDebugEvent("demo", "manual marker", {
                  rows: rows.length,
                  limit
                });
                setDebugEvents(readDemoDebugEvents());
              }}
            >
              Add marker
            </button>
            <span className="text-xs text-slate-500">events: {debugEvents.length}</span>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[11px] leading-4 text-slate-700">
            {debugEvents.slice(-160).map(formatDebugEvent).join("\n")}
          </pre>
          <p className="mt-2 text-xs text-slate-500">
            Debug mode is enabled. Use <code>?dt_debug=0</code> to disable.
          </p>
        </section>
      ) : null}
    </main>
  );
}
