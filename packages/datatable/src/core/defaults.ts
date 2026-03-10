import type {
  DataTableFeatureFlags,
  DataTableQueryState,
  DataTableThemeTokens,
  PersistedTableState
} from "./types";

export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_OVERSCAN = 8;
export const DEFAULT_MIN_ROW_HEIGHT = 40;

export const DEFAULT_FEATURE_FLAGS: Required<DataTableFeatureFlags> = {
  columnResize: true,
  rowResize: true,
  columnReorder: true,
  columnPinning: true,
  columnVisibility: true,
  columnFilter: true,
  columnSort: true,
  rowDelete: false,
  rowSelect: true,
  rowAdd: false,
  rowActions: true,
  editing: false,
  cellSelect: true,
  clipboardCopy: true,
  clipboardPaste: false,
  undo: false,
  autoSave: true,
  infiniteScroll: true,
  virtualization: true
};

export const DEFAULT_THEME_TOKENS: DataTableThemeTokens = {
  fontFamily: "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif",
  radius: "14px",
  borderColor: "hsl(215 18% 85%)",
  headerBg: "linear-gradient(180deg, hsl(210 33% 98%), hsl(210 35% 95%))",
  pinnedHeaderBg: "linear-gradient(180deg, hsl(210 28% 96%), hsl(210 28% 92.5%))",
  rowBg: "hsl(0 0% 100%)",
  rowHoverBg: "hsl(206 45% 97%)",
  pinnedRowBg: "hsl(210 20% 97%)",
  pinnedRowHoverBg: "hsl(206 42% 95%)",
  pinnedShadow: "0 0 0 1px hsl(213 20% 84%), 0 8px 24px -16px hsl(215 30% 35%)",
  activeCellRing: "hsl(206 90% 48%)",
  selectionBg: "hsl(205 86% 94%)"
};

export const EMPTY_QUERY_STATE: DataTableQueryState = {
  sorting: [],
  filters: [],
  pageSize: DEFAULT_PAGE_SIZE,
  cursor: null
};

export const EMPTY_PERSISTED_STATE: PersistedTableState = {
  sorting: [],
  filters: [],
  columnOrder: [],
  pinLeft: [],
  pinRight: [],
  hiddenColumns: [],
  widths: {}
};

export const URL_WRITE_DEBOUNCE_MS = 150;
export const STORAGE_WRITE_DEBOUNCE_MS = 250;
export const DELETE_UNDO_MS = 4000;
