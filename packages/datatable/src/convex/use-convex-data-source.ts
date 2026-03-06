import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "../core/defaults";
import type {
  ConvexDataSourceConfig,
  DataTableDataSource,
  DataTableQueryState,
  DataTableRowModel
} from "../core/types";

function querySignature(state: DataTableQueryState): string {
  return JSON.stringify({
    sorting: state.sorting,
    filters: state.filters,
    pageSize: state.pageSize
  });
}

function useConvexRows<TRow extends DataTableRowModel>(
  config: ConvexDataSourceConfig<TRow>,
  query: DataTableQueryState
): ReturnType<DataTableDataSource<TRow>["useRows"]> {
  const [activeCursor, setActiveCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<ReadonlyArray<TRow>>([]);
  const loadedCursorKeys = useRef<Set<string>>(new Set());

  const signature = querySignature(query);
  const signatureRef = useRef(signature);

  useEffect(() => {
    if (signatureRef.current === signature) {
      return;
    }

    signatureRef.current = signature;
    loadedCursorKeys.current.clear();
    setRows([]);
    setActiveCursor(null);
  }, [signature]);

  const page = config.usePageQuery({
    cursor: activeCursor,
    pageSize: query.pageSize,
    state: {
      ...query,
      cursor: activeCursor
    }
  });

  useEffect(() => {
    if (page.status !== "loaded") {
      return;
    }

    const key = activeCursor ?? "__root__";
    if (loadedCursorKeys.current.has(key)) {
      return;
    }

    loadedCursorKeys.current.add(key);

    if (activeCursor === null) {
      setRows(page.rows);
      return;
    }

    setRows((current) => [...current, ...page.rows]);
  }, [activeCursor, page.rows, page.status]);

  const loadMore = useCallback(() => {
    if (page.status === "loading") {
      return;
    }
    if (!page.nextCursor) {
      return;
    }
    setActiveCursor(page.nextCursor);
  }, [page.nextCursor, page.status]);

  const refresh = useCallback(() => {
    loadedCursorKeys.current.clear();
    setRows([]);
    setActiveCursor(null);
  }, []);

  return {
    rows,
    hasMore: page.nextCursor !== null,
    isLoading: page.status === "loading" && rows.length === 0,
    isLoadingMore: page.status === "loading" && rows.length > 0,
    error: page.error,
    loadMore,
    refresh
  };
}

export function useConvexDataSource<TRow extends DataTableRowModel>(
  config: ConvexDataSourceConfig<TRow>
): DataTableDataSource<TRow> {
  return useMemo(() => {
    const source: DataTableDataSource<TRow> = {
      useRows: (query) =>
        useConvexRows(config, {
          ...query,
          pageSize: query.pageSize > 0 ? query.pageSize : config.pageSize ?? DEFAULT_PAGE_SIZE
        })
    };

    if (config.createRow) {
      source.createRow = config.createRow;
    }
    if (config.updateRows) {
      source.updateRows = config.updateRows;
    }
    if (config.deleteRows) {
      source.deleteRows = config.deleteRows;
    }
    if (config.restoreRows) {
      source.restoreRows = config.restoreRows;
    }

    return source;
  }, [config]);
}
