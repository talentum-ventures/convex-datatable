import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "./primitives";
import type { DataTableRowAction, DataTableRowModel, RowId } from "../core/types";

export type RowActionsProps<TRow extends DataTableRowModel> = {
  row: TRow;
  rowId: RowId;
  rowActions: ReadonlyArray<DataTableRowAction<TRow>>;
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
  isMenuOpen,
  canDelete,
  onDelete,
  onToggleMenu,
  onActionSelect
}: RowActionsProps<TRow>): JSX.Element {
  const hasCustomActions = rowActions.length > 0;

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

      {hasCustomActions ? (
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
