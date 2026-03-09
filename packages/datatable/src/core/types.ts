import type { ComponentType, ReactElement, ReactNode } from "react";

export type StringKey<T> = Extract<keyof T, string>;
export type RowId = string;
export type ColumnId = string;

export type DataTableColumnKind =
  | "text"
  | "longText"
  | "number"
  | "currency"
  | "select"
  | "multiselect"
  | "link"
  | "date"
  | "reactNode";

export type DataTableReactValue =
  | string
  | number
  | boolean
  | null
  | ReactElement
  | ReadonlyArray<DataTableReactValue>;

export type DataTableCellValue =
  | string
  | number
  | boolean
  | null
  | Date
  | ReadonlyArray<string>
  | DataTableReactValue
  | undefined;

export type DataTableRowModel = Record<string, DataTableCellValue>;

export type SortDirection = "asc" | "desc";

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in";

export type DataTableFilterValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<string>;

export type DataTableFilter = {
  columnId: ColumnId;
  op: FilterOperator;
  value: DataTableFilterValue;
};

export type DataTableSort = {
  columnId: ColumnId;
  direction: SortDirection;
};

export type DataTableQueryState = {
  sorting: ReadonlyArray<DataTableSort>;
  filters: ReadonlyArray<DataTableFilter>;
  pageSize: number;
  cursor: string | null;
};

export type DataTableFeatureFlags = {
  columnResize?: boolean;
  rowResize?: boolean;
  columnReorder?: boolean;
  columnPinning?: boolean;
  columnVisibility?: boolean;
  columnFilter?: boolean;
  columnSort?: boolean;
  rowDelete?: boolean;
  rowSelect?: boolean;
  rowAdd?: boolean;
  rowActions?: boolean;
  editing?: boolean;
  cellSelect?: boolean;
  clipboardCopy?: boolean;
  clipboardPaste?: boolean;
  undo?: boolean;
  infiniteScroll?: boolean;
  virtualization?: boolean;
};

export type SelectOption = {
  value: string;
  label: string;
  colorClass: string;
  icon?: ComponentType<{ className?: string | undefined }>;
};

export type DataTableCellRenderContext<
  TRow extends DataTableRowModel,
  TValue
> = {
  row: TRow;
  rowId: RowId;
  value: TValue;
  isEditing: boolean;
};

export type DataTableCellEditorContext<
  TRow extends DataTableRowModel,
  TValue
> = {
  row: TRow;
  rowId: RowId;
  value: TValue;
  commit: (nextValue: TValue) => void;
  cancel: () => void;
};

export type ColumnValidator<TRow extends DataTableRowModel, TValue> = (
  value: TValue,
  row: TRow
) => string | null;

export type ColumnCommon<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow>,
  TValue
> = {
  id: ColumnId;
  field: K;
  header: string;
  description?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  isEditable?: boolean;
  isResizable?: boolean;
  isReorderable?: boolean;
  isPinnable?: boolean;
  isHideable?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  accessor?: (row: TRow) => TValue;
  validator?: ColumnValidator<TRow, TValue>;
  parseInput?: (input: string, row: TRow) => TValue;
  serializeClipboard?: (value: TValue, row: TRow) => string;
  parseClipboard?: (text: string, row: TRow) => TValue;
  renderCell?: (ctx: DataTableCellRenderContext<TRow, TValue>) => ReactNode;
  renderEditor?: (ctx: DataTableCellEditorContext<TRow, TValue>) => ReactNode;
};

export type TextColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, string> & {
    kind: "text";
    placeholder?: string;
  };

export type LongTextColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, string> & {
    kind: "longText";
    placeholder?: string;
    maxLines?: number;
  };

export type NumberColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, number> & {
    kind: "number";
    precision?: number;
    minimum?: number;
    maximum?: number;
  };

export type CurrencyColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> = ColumnCommon<TRow, K, number> & {
  kind: "currency";
  currency: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export type SelectColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, string> & {
    kind: "select";
    options: ReadonlyArray<SelectOption>;
  };

export type MultiSelectColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> = ColumnCommon<TRow, K, ReadonlyArray<string>> & {
  kind: "multiselect";
  options: ReadonlyArray<SelectOption>;
};

export type LinkColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, string> & {
    kind: "link";
    target?: "_self" | "_blank";
    rel?: string;
  };

export type DateColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> =
  ColumnCommon<TRow, K, string | Date> & {
    kind: "date";
    locale?: string;
    timezone?: string;
    dateStyle?: "full" | "long" | "medium" | "short";
  };

export type ReactNodeColumn<
  TRow extends DataTableRowModel,
  K extends StringKey<TRow> = StringKey<TRow>
> = ColumnCommon<TRow, K, DataTableReactValue> & {
  kind: "reactNode";
  renderCell: (ctx: DataTableCellRenderContext<TRow, DataTableReactValue>) => ReactNode;
  renderEditor: (ctx: DataTableCellEditorContext<TRow, DataTableReactValue>) => ReactNode;
  serializeClipboard: (value: DataTableReactValue, row: TRow) => string;
  parseClipboard: (text: string, row: TRow) => DataTableReactValue;
  parseInput: (input: string, row: TRow) => DataTableReactValue;
};

export type DataTableColumn<TRow extends DataTableRowModel> =
  | TextColumn<TRow>
  | LongTextColumn<TRow>
  | NumberColumn<TRow>
  | CurrencyColumn<TRow>
  | SelectColumn<TRow>
  | MultiSelectColumn<TRow>
  | LinkColumn<TRow>
  | DateColumn<TRow>
  | ReactNodeColumn<TRow>;

export type DataTableRowActionContext<TRow extends DataTableRowModel> = {
  row: TRow;
  rowId: RowId;
};

export type DataTableRowAction<TRow extends DataTableRowModel> = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string | undefined }>;
  variant?: "default" | "destructive";
  isVisible?: (row: TRow) => boolean;
  isDisabled?: (row: TRow) => boolean;
  onSelect: (ctx: DataTableRowActionContext<TRow>) => void | Promise<void>;
};

export type DataTableThemeTokens = {
  fontFamily: string;
  radius: string;
  borderColor: string;
  headerBg: string;
  pinnedHeaderBg: string;
  rowBg: string;
  rowHoverBg: string;
  pinnedRowBg: string;
  pinnedRowHoverBg: string;
  pinnedShadow: string;
  activeCellRing: string;
  selectionBg: string;
};

export type DataTableRowsResult<TRow extends DataTableRowModel> = {
  rows: ReadonlyArray<TRow>;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
};

export type RowPatch<TRow extends DataTableRowModel> = {
  rowId: RowId;
  patch: Partial<TRow>;
};

export type DataTableDataSource<TRow extends DataTableRowModel> = {
  useRows: (query: DataTableQueryState) => DataTableRowsResult<TRow>;
  createRow?: (draft: Partial<TRow>) => Promise<TRow>;
  updateRows?: (changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>;
  deleteRows?: (rowIds: ReadonlyArray<RowId>) => Promise<void>;
  restoreRows?: (rows: ReadonlyArray<TRow>) => Promise<void>;
};

export type DataTableOnError = (message: string) => void;

export type CollaboratorCellCoord = {
  rowId: RowId;
  columnId: ColumnId;
};

export type CollaboratorPresence = {
  userId: string;
  name: string;
  color: string;
  activeCell: CollaboratorCellCoord | null;
};

export type ConvexPresenceEntry = {
  tableId: string;
  userId: string;
  userName: string;
  userColor: string;
  activeRowId: RowId | null;
  activeColumnId: ColumnId | null;
  lastSeen: number;
};

export type ConvexPresenceConfig = {
  tableId: string;
  userId: string;
  userName: string;
  userColor?: string;
  usePresenceData: (tableId: string) => ReadonlyArray<ConvexPresenceEntry>;
  sendHeartbeat: (entry: ConvexPresenceEntry) => void | Promise<void>;
  debounceMs?: number;
  heartbeatIntervalMs?: number;
};

export type RowSchemaIssue = {
  path: ReadonlyArray<PropertyKey>;
  message: string;
};

export type RowSchemaResult<TRow> =
  | { success: true; data: TRow }
  | { success: false; error: { issues: ReadonlyArray<RowSchemaIssue> } };

export type RowSchema<TRow> = {
  safeParse: (value: TRow) => RowSchemaResult<TRow>;
};

export type DataTableProps<TRow extends DataTableRowModel> = {
  tableId: string;
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  dataSource: DataTableDataSource<TRow>;
  rowSchema?: RowSchema<TRow>;
  features?: DataTableFeatureFlags;
  rowActions?: ReadonlyArray<DataTableRowAction<TRow>>;
  minRowHeight?: number;
  pageSize?: number;
  theme?: Partial<DataTableThemeTokens>;
  className?: string;
  collaborators?: ReadonlyArray<CollaboratorPresence>;
  onActiveCellChange?: (cell: CollaboratorCellCoord | null) => void;
  onError?: DataTableOnError;
};

export type ConvexPageResult<TRow extends DataTableRowModel> = {
  rows: ReadonlyArray<TRow>;
  nextCursor: string | null;
  status: "loading" | "loaded" | "error";
  error: string | null;
};

export type ConvexDataSourceConfig<TRow extends DataTableRowModel> = {
  tableId: string;
  pageSize?: number;
  usePageQuery: (args: {
    cursor: string | null;
    pageSize: number;
    state: DataTableQueryState;
  }) => ConvexPageResult<TRow>;
  createRow?: (draft: Partial<TRow>) => Promise<TRow>;
  updateRows?: (changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>;
  deleteRows?: (rowIds: ReadonlyArray<RowId>) => Promise<void>;
  restoreRows?: (rows: ReadonlyArray<TRow>) => Promise<void>;
};

export type CellCoord = {
  rowIndex: number;
  columnIndex: number;
};

export type EditingCellState = {
  rowId: RowId;
  columnId: string;
} | null;

export type CellRange = {
  start: CellCoord;
  end: CellCoord;
};

export type PersistedTableState = {
  sorting: ReadonlyArray<DataTableSort>;
  filters: ReadonlyArray<DataTableFilter>;
  columnOrder: ReadonlyArray<ColumnId>;
  pinLeft: ReadonlyArray<ColumnId>;
  pinRight: ReadonlyArray<ColumnId>;
  hiddenColumns: ReadonlyArray<ColumnId>;
  widths: Readonly<Record<ColumnId, number>>;
};
