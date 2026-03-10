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
  config: Pick<ConvexDataSourceConfig<TRow>, "usePageQuery">,
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
  const { pageSize, usePageQuery, createRow, updateRows, deleteRows, restoreRows } = config;

  return useMemo(() => {
    const source: DataTableDataSource<TRow> = {
      useRows: (query) =>
        useConvexRows(
          {
            usePageQuery
          },
          {
            ...query,
            pageSize: query.pageSize > 0 ? query.pageSize : pageSize ?? DEFAULT_PAGE_SIZE
          }
        )
    };

    if (createRow) {
      source.createRow = createRow;
    }
    if (updateRows) {
      source.updateRows = updateRows;
    }
    if (deleteRows) {
      source.deleteRows = deleteRows;
    }
    if (restoreRows) {
      source.restoreRows = restoreRows;
    }

    return source;
  }, [createRow, deleteRows, pageSize, restoreRows, updateRows, usePageQuery]);
}
