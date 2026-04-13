import { memo } from "react";
import { ChevronDown, Copy, LoaderCircle, Plus, Rows3, Trash2 } from "lucide-react";
import { cn } from "../core/cn";
import type { DataTableToolbarState } from "../core/types";
import { Button } from "./primitives";

export type TableToolbarProps = {
  canAddRow: boolean;
  canDeleteSelected: boolean;
  selectedRowCount: number;
  canCopy: boolean;
  canManageVisibility: boolean;
  isLoading: boolean;
  hiddenColumns: DataTableToolbarState["hiddenColumns"];
  orderedColumns: ReadonlyArray<{
    id: string;
    header: string;
    isVisible: boolean;
  }>;
  onAddRow: () => void;
  onDeleteSelected: () => void;
  onCopy: () => void;
  onShowColumn: (columnId: string) => void;
  onShowAllColumns: () => void;
};

function TableToolbarInner({
  canAddRow,
  canDeleteSelected,
  selectedRowCount,
  canCopy,
  canManageVisibility,
  isLoading,
  hiddenColumns,
  orderedColumns,
  onAddRow,
  onDeleteSelected,
  onCopy,
  onShowColumn,
  onShowAllColumns
}: TableToolbarProps): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div className="flex flex-wrap items-center gap-2">
        {canAddRow ? (
          <Button size="sm" onClick={onAddRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        ) : null}

        {canDeleteSelected ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedRowCount === 0}
            onClick={onDeleteSelected}
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        ) : null}

        {canCopy ? (
          <Button variant="secondary" size="sm" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        ) : null}

        {isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Loading rows...
          </span>
        ) : null}
      </div>

      {canManageVisibility && hiddenColumns.length > 0 ? (
        <details className="group relative min-w-[280px]">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1">
              <Rows3 className="h-4 w-4" />
              Hidden columns ({hiddenColumns.length})
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 max-h-72 w-[360px] overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            <div className="mb-2 flex items-center justify-between border-b border-slate-200 px-2 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Column visibility</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowAllColumns}
              >
                Show all hidden
              </Button>
            </div>
            {orderedColumns.map((column) => {
              const isVisible = column.isVisible;
              return (
                <div
                  key={column.id}
                  data-hidden-column-row={column.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md px-2 py-1.5",
                    isVisible ? "" : "bg-amber-50/60"
                  )}
                >
                  <span className="text-sm text-slate-700">{column.header}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      isVisible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {isVisible ? "Visible" : "Hidden"}
                  </span>
                  {!isVisible ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onShowColumn(column.id);
                      }}
                    >
                      Show
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export const TableToolbar = memo(TableToolbarInner);
