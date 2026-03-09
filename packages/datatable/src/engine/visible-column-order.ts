import type { RowData, Table } from "@tanstack/react-table";
import { isManagedUtilityColumnId } from "./managed-columns";

export function getVisibleLeafColumnIdsInUiOrder<TRow extends RowData>(
  table: Table<TRow>
): ReadonlyArray<string> {
  return [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns()
  ].map((column) => column.id);
}

export function getVisibleDataColumnIdsInUiOrder<TRow extends RowData>(
  table: Table<TRow>
): ReadonlyArray<string> {
  return getVisibleLeafColumnIdsInUiOrder(table).filter((columnId) => !isManagedUtilityColumnId(columnId));
}
