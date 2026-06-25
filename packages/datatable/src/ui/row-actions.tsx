import { MoreVertical, Trash2 } from "lucide-react";
import { cn } from "../core/cn";
import type {
  DataTableProps,
  DataTableRowAction,
  DataTableRowActionWithIcon,
  DataTableRowModel,
  RowId
} from "../core/types";
import { Button } from "./primitives";

export type RowActionsPresentation = "compact" | "menu";

function isRowActionsArray<TRow extends DataTableRowModel>(
  rowActions: NonNullable<DataTableProps<TRow>["rowActions"]>
): rowActions is ReadonlyArray<DataTableRowAction<TRow>> {
  return Array.isArray(rowActions);
}

export function resolveRowActionsInput<TRow extends DataTableRowModel>(
  rowActions: DataTableProps<TRow>["rowActions"]
): {
  presentation: RowActionsPresentation;
  actions: ReadonlyArray<DataTableRowAction<TRow>>;
} {
  if (rowActions == null) {
    return { presentation: "menu", actions: [] };
  }
  if (isRowActionsArray(rowActions)) {
    return { presentation: "menu", actions: rowActions };
  }
  const compactRowAction: DataTableRowActionWithIcon<TRow> = rowActions;
  return { presentation: "compact", actions: [compactRowAction] };
}

export type RowActionsProps<TRow extends DataTableRowModel> = {
  row: TRow;
  rowId: RowId;
  rowActions: ReadonlyArray<DataTableRowAction<TRow>>;
  presentation: RowActionsPresentation;
  isMenuOpen: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onToggleMenu: () => void;
  onActionSelect: (action: DataTableRowAction<TRow>) => void | Promise<void>;
};

export function RowActions<TRow extends DataTableRowModel>({
  row,
  rowId,
  rowActions,
  presentation,
  isMenuOpen,
  canDelete,
  onDelete,
  onToggleMenu,
  onActionSelect
}: RowActionsProps<TRow>): JSX.Element {
  const hasCustomActions = rowActions.length > 0;
  const compactAction =
    presentation === "compact" && rowActions.length === 1 ? rowActions[0] : null;
  const CompactActionIcon = compactAction?.icon;

  return (
    <div className="flex items-center justify-center gap-0.5 py-1">
      {canDelete ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          aria-label={`Delete row ${rowId}`}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}

      {compactAction && CompactActionIcon ? (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 px-0",
            compactAction.variant === "destructive" &&
              "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          )}
          aria-label={compactAction.label}
          title={compactAction.label}
          disabled={compactAction.isDisabled?.(row) ?? false}
          onClick={() => {
            void onActionSelect(compactAction);
          }}
        >
          <CompactActionIcon className="h-3.5 w-3.5" />
        </Button>
      ) : null}

      {!compactAction && hasCustomActions ? (
        <div className="relative" data-dt-row-action-menu-root="true">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 px-0"
            aria-label={`Open actions for row ${rowId}`}
            aria-haspopup="menu"
            data-row-action-menu-trigger={rowId}
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>

          {isMenuOpen ? (
            <div
              role="menu"
              aria-label={`Actions for row ${rowId}`}
              className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-xl"
            >
              {rowActions.map((action) => (
                <Button
                  key={`${rowId}-${action.id}`}
                  variant={action.variant === "destructive" ? "destructive" : "ghost"}
                  size="sm"
                  role="menuitem"
                  className="w-full justify-start"
                  disabled={action.isDisabled?.(row) ?? false}
                  onClick={() => {
                    void onActionSelect(action);
                  }}
                >
                  {action.icon ? <action.icon className="h-3.5 w-3.5" /> : null}
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
