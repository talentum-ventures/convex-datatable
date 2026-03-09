import { memo } from "react";
import { flexRender, type Table } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Filter, GripVertical, MoreVertical } from "lucide-react";
import { cn } from "../core/cn";
import { isActiveFilterValue } from "../core/filtering";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowModel,
  FilterOperator
} from "../core/types";
import type { ColumnLayoutResult } from "./column-layout";
import type {
  ColumnMenuAnchor,
  DropPlacement
} from "../hooks/use-table-columns";
import { ACTIONS_COLUMN_ID } from "../engine/managed-columns";
import { Button } from "./primitives";
import { ColumnMenu } from "./column-menu";

function shouldCenterHeaderContent(columnId: string): boolean {
  return columnId === "__select__";
}

export type TableHeaderProps<TRow extends DataTableRowModel> = {
  table: Table<TRow>;
  columnById: ReadonlyMap<string, DataTableColumn<TRow>>;
  columnRenderLayout: ColumnLayoutResult;
  columnSizing: Readonly<Record<string, number>>;
  fixedTrackStyle: (width: number) => React.CSSProperties;
  columnMenuId: string | null;
  columnMenuAnchorById: Readonly<Record<string, ColumnMenuAnchor>>;
  dragOverTarget: { columnId: string; placement: DropPlacement } | null;
  mergedFeatures: {
    columnSort: boolean;
    columnFilter: boolean;
    columnVisibility: boolean;
    columnPinning: boolean;
    columnReorder: boolean;
    columnResize: boolean;
  };
  filterByColumnId: ReadonlyMap<string, DataTableFilter>;
  selectedFilterOperator: (column: DataTableColumn<TRow>) => FilterOperator;
  selectColumnFilterTextValue: (column: DataTableColumn<TRow>) => string;
  selectColumnFilterValues: (column: DataTableColumn<TRow>) => ReadonlyArray<string>;
  setColumnFilterOperator: (column: DataTableColumn<TRow>, operator: FilterOperator) => void;
  setColumnFilterTextValue: (column: DataTableColumn<TRow>, value: string) => void;
  toggleColumnFilterInValue: (column: DataTableColumn<TRow>, value: string, enabled: boolean) => void;
  clearColumnFilter: (columnId: string) => void;
  toggleColumnMenu: (columnId: string, trigger: HTMLElement) => void;
  setColumnMenuId: (columnId: string | null) => void;
  updatePinnedColumn: (columnId: string, side: "left" | "right" | "none") => void;
  setColumnSortDirection: (columnId: string, direction: "asc" | "desc") => void;
  onHeaderDragStart: (event: React.DragEvent<HTMLElement>, columnId: string) => void;
  onHeaderDragOver: (event: React.DragEvent<HTMLTableCellElement>, targetColumnId: string) => void;
  onHeaderDrop: (event: React.DragEvent<HTMLTableCellElement>, targetColumnId: string) => void;
  onHeaderDragEnd: () => void;
  beginColumnResize: (args: {
    ownerDocument: Document;
    columnId: string;
    startWidth: number;
    startX: number;
    minWidth: number;
    maxWidth: number | null;
  }) => void;
};

function TableHeaderInner<TRow extends DataTableRowModel>({
  table,
  columnById,
  columnRenderLayout,
  columnSizing,
  fixedTrackStyle,
  columnMenuId,
  columnMenuAnchorById,
  dragOverTarget,
  mergedFeatures,
  filterByColumnId,
  selectedFilterOperator,
  selectColumnFilterTextValue,
  selectColumnFilterValues,
  setColumnFilterOperator,
  setColumnFilterTextValue,
  toggleColumnFilterInValue,
  clearColumnFilter,
  toggleColumnMenu,
  setColumnMenuId,
  updatePinnedColumn,
  setColumnSortDirection,
  onHeaderDragStart,
  onHeaderDragOver,
  onHeaderDrop,
  onHeaderDragEnd,
  beginColumnResize
}: TableHeaderProps<TRow>): JSX.Element {
  return (
    <thead
      className="sticky top-0 z-30"
      style={{
        display: "grid",
        background: "var(--dt-header-bg)"
      }}
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          style={{
            display: "flex",
            width: `${columnRenderLayout.tableRenderWidth}px`
          }}
        >
          {headerGroup.headers.map((header) => {
            const columnConfig = columnById.get(header.column.id);
            const isDataColumn = Boolean(columnConfig);
            const centerHeaderContent = shouldCenterHeaderContent(header.column.id);
            const canSort = Boolean(columnConfig) && mergedFeatures.columnSort && header.column.getCanSort();
            const canFilter =
              Boolean(columnConfig) && mergedFeatures.columnFilter && (columnConfig?.isFilterable ?? true);
            const canHide =
              Boolean(columnConfig) && mergedFeatures.columnVisibility && header.column.getCanHide();
            const canPin =
              Boolean(columnConfig) && mergedFeatures.columnPinning && (columnConfig?.isPinnable ?? true);
            const canReorder =
              Boolean(columnConfig) && mergedFeatures.columnReorder && (columnConfig?.isReorderable ?? true);
            const currentFilter = columnConfig ? filterByColumnId.get(columnConfig.id) : undefined;
            const hasFilter = Boolean(currentFilter && isActiveFilterValue(currentFilter.value));
            const isMenuOpen = columnMenuId === columnConfig?.id;
            const sortState = header.column.getIsSorted();
            const activeFilterOperator = columnConfig ? selectedFilterOperator(columnConfig) : "contains";
            const textFilterValue = columnConfig ? selectColumnFilterTextValue(columnConfig) : "";
            const selectedFilterValues = columnConfig ? selectColumnFilterValues(columnConfig) : [];
            const dropIndicator =
              dragOverTarget && columnConfig && dragOverTarget.columnId === columnConfig.id
                ? dragOverTarget.placement === "before"
                  ? "inset 3px 0 0 hsl(199 89% 48%)"
                  : "inset -3px 0 0 hsl(199 89% 48%)"
                : undefined;
            const fallbackHeader = columnConfig?.header ?? "column";
            const resizeLabel =
              typeof header.column.columnDef.header === "string" ||
              typeof header.column.columnDef.header === "number"
                ? String(header.column.columnDef.header)
                : fallbackHeader;
            const pinnedState = header.column.getIsPinned();
            const isPinned = pinnedState === "left" || pinnedState === "right";
            const renderWidth = columnRenderLayout.renderWidthsById[header.column.id] ?? header.getSize();
            const leftOffset = columnRenderLayout.leftPinnedOffsetById[header.column.id];
            const rightOffset = columnRenderLayout.rightPinnedOffsetById[header.column.id];
            const isActionHeader = header.column.id === ACTIONS_COLUMN_ID;

            return (
              <th
                key={header.id}
                onDragOver={
                  canReorder && columnConfig
                    ? (event) => {
                        onHeaderDragOver(event, columnConfig.id);
                      }
                    : undefined
                }
                onDrop={
                  canReorder && columnConfig
                    ? (event) => {
                        onHeaderDrop(event, columnConfig.id);
                      }
                    : undefined
                }
                data-column-id={columnConfig?.id}
                data-column-sort-status={sortState || "none"}
                data-column-filter-active={hasFilter ? "true" : "false"}
                data-pinned-state={pinnedState || "center"}
                className={cn(
                  "group relative border-b border-r border-[var(--dt-border-color)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600",
                  isActionHeader ? "border-l border-l-[var(--dt-border-color)]" : "",
                  pinnedState
                    ? "sticky z-30 shadow-[var(--dt-pinned-shadow)] [background:var(--dt-pinned-header-bg)]"
                    : "[background:var(--dt-header-bg)]"
                )}
                style={{
                  ...fixedTrackStyle(renderWidth),
                  boxShadow: dropIndicator,
                  left: pinnedState === "left" ? `${leftOffset ?? 0}px` : undefined,
                  right: pinnedState === "right" ? `${rightOffset ?? 0}px` : undefined
                }}
              >
                <div
                  className={cn(
                    "flex w-full items-center gap-1",
                    centerHeaderContent ? "justify-center" : "justify-between"
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1",
                      centerHeaderContent ? "w-full justify-center" : undefined
                    )}
                  >
                    {canReorder && columnConfig ? (
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          onHeaderDragStart(event, columnConfig.id);
                        }}
                        onDragEnd={onHeaderDragEnd}
                        data-column-reorder-handle={columnConfig.id}
                        aria-label={`Reorder ${fallbackHeader}`}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:text-slate-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group-hover:opacity-100"
                      >
                        <GripVertical className="h-3.5 w-3.5 cursor-grab active:cursor-grabbing" />
                      </button>
                    ) : null}
                    <span className="truncate text-left">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {sortState === "asc" ? (
                        <span className="inline-flex items-center text-sky-700" aria-label="Sorted ascending">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </span>
                      ) : sortState === "desc" ? (
                        <span className="inline-flex items-center text-sky-700" aria-label="Sorted descending">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      {hasFilter ? (
                        <span className="inline-flex items-center text-emerald-700" aria-label="Filter active">
                          <Filter className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {isDataColumn && columnConfig ? (
                    <div className="relative" data-dt-column-menu-root="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        data-column-menu-trigger={columnConfig.id}
                        onClick={(event) => {
                          toggleColumnMenu(columnConfig.id, event.currentTarget);
                        }}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                        <span className="sr-only">Open column menu</span>
                      </Button>

                      {isMenuOpen ? (
                        <ColumnMenu
                          column={columnConfig}
                          sortState={sortState}
                          canSort={canSort}
                          canHide={canHide}
                          canPin={canPin}
                          canFilter={canFilter}
                          isPinned={isPinned}
                          anchor={columnMenuAnchorById[columnConfig.id] ?? "right"}
                          activeFilterOperator={activeFilterOperator}
                          textFilterValue={textFilterValue}
                          selectedFilterValues={selectedFilterValues}
                          onSort={(direction) => {
                            setColumnSortDirection(columnConfig.id, direction);
                          }}
                          onPin={(side) => {
                            updatePinnedColumn(columnConfig.id, side);
                          }}
                          onHide={() => {
                            table.getColumn(columnConfig.id)?.toggleVisibility(false);
                            setColumnMenuId(null);
                          }}
                          onClearFilter={() => {
                            clearColumnFilter(columnConfig.id);
                          }}
                          onSetFilterOperator={(operator) => {
                            setColumnFilterOperator(columnConfig, operator);
                          }}
                          onSetFilterTextValue={(value) => {
                            setColumnFilterTextValue(columnConfig, value);
                          }}
                          onToggleFilterValue={(value, enabled) => {
                            toggleColumnFilterInValue(columnConfig, value, enabled);
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {mergedFeatures.columnResize && header.column.getCanResize() ? (
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-sky-200"
                      data-column-resize-handle={header.column.id}
                      draggable={false}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const headerRect = event.currentTarget.closest("th")?.getBoundingClientRect();
                        const startX = Number.isFinite(event.clientX)
                          ? event.clientX
                          : Math.round((headerRect?.right ?? 0) - 1);
                        beginColumnResize({
                          ownerDocument: event.currentTarget.ownerDocument,
                          columnId: header.column.id,
                          startWidth: columnSizing[header.column.id] ?? header.getSize(),
                          startX,
                          minWidth: header.column.columnDef.minSize ?? 20,
                          maxWidth: header.column.columnDef.maxSize ?? null
                        });
                      }}
                      onTouchStart={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const touch = event.touches[0];
                        const headerRect = event.currentTarget.closest("th")?.getBoundingClientRect();
                        const startX = touch ? touch.clientX : Math.round((headerRect?.right ?? 0) - 1);
                        beginColumnResize({
                          ownerDocument: event.currentTarget.ownerDocument,
                          columnId: header.column.id,
                          startWidth: columnSizing[header.column.id] ?? header.getSize(),
                          startX,
                          minWidth: header.column.columnDef.minSize ?? 20,
                          maxWidth: header.column.columnDef.maxSize ?? null
                        });
                      }}
                      aria-label={`Resize ${resizeLabel}`}
                    />
                  ) : null}
                </div>
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

export const TableHeader = memo(TableHeaderInner) as typeof TableHeaderInner;
