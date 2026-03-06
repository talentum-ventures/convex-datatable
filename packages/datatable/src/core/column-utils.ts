import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel,
  RowPatch,
  RowId
} from "./types";

export function orderColumns<TRow extends DataTableRowModel>(
  columns: ReadonlyArray<DataTableColumn<TRow>>,
  order: ReadonlyArray<string>
): ReadonlyArray<DataTableColumn<TRow>> {
  if (order.length === 0) {
    return columns;
  }

  const byId = new Map<string, DataTableColumn<TRow>>();
  for (const column of columns) {
    byId.set(column.id, column);
  }

  const ordered: DataTableColumn<TRow>[] = [];

  for (const id of order) {
    const found = byId.get(id);
    if (found) {
      ordered.push(found);
      byId.delete(id);
    }
  }

  for (const column of columns) {
    if (byId.has(column.id)) {
      ordered.push(column);
      byId.delete(column.id);
    }
  }

  return ordered;
}

export function getColumnValue<TRow extends DataTableRowModel>(
  row: TRow,
  column: DataTableColumn<TRow>
): DataTableCellValue {
  if (column.accessor) {
    return column.accessor(row);
  }
  return row[column.field];
}

export function setColumnValue<TRow extends DataTableRowModel>(
  row: TRow,
  rowId: RowId,
  column: DataTableColumn<TRow>,
  value: DataTableCellValue
): {
  nextRow: TRow;
  patch: RowPatch<TRow>;
} {
  const nextRow = {
    ...row,
    [column.field]: value
  } as TRow;

  const patch: RowPatch<TRow> = {
    rowId,
    patch: nextRow
  };

  return {
    nextRow,
    patch
  };
}
