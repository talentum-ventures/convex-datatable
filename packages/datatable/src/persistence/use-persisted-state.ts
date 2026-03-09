import { useEffect, useMemo, useRef } from "react";
import {
  STORAGE_WRITE_DEBOUNCE_MS,
  URL_WRITE_DEBOUNCE_MS
} from "../core/defaults";
import {
  debugEnabled,
  pushDebugEvent,
  pushDebugEventThrottled
} from "../debug";
import type { DataTableOnError, PersistedTableState } from "../core/types";
import {
  decodePersistedStateFromUrl,
  encodePersistedStateToUrl,
  mergePersistedState,
  storageKey
} from "./query-codec";
import { readPersistedState, writePersistedState } from "./storage";

export type UsePersistedStateArgs = {
  tableId: string;
  state: PersistedTableState;
  onHydrate: (state: PersistedTableState) => void;
  onError: DataTableOnError | undefined;
};

export function usePersistedState({
  tableId,
  state,
  onHydrate,
  onError
}: UsePersistedStateArgs): void {
  const isDebugMode = useMemo(() => debugEnabled(), []);
  const debugScope = useMemo(() => `persist:${tableId}`, [tableId]);
  const storageKeyValue = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return storageKey(window.location.pathname, tableId);
  }, [tableId]);

  const hasHydrated = useRef(false);
  const urlTimer = useRef<number | null>(null);
  const storageTimer = useRef<number | null>(null);
  const urlWrites = useRef<number[]>([]);
  const storageWrites = useRef<number[]>([]);
  const onHydrateRef = useRef(onHydrate);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onHydrateRef.current = onHydrate;
  }, [onHydrate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const currentOnError = onErrorRef.current;
    const fromUrl = decodePersistedStateFromUrl(tableId, params, currentOnError);
    const fromStorage = readPersistedState(storageKeyValue, currentOnError);
    const merged = mergePersistedState(fromUrl, fromStorage);

    onHydrateRef.current(merged);
    hasHydrated.current = true;

    if (isDebugMode) {
      pushDebugEvent(debugScope, "hydrated persisted state", {
        urlSort: fromUrl.sorting.length,
        urlFilters: fromUrl.filters.length,
        storageSort: fromStorage.sorting.length,
        storageFilters: fromStorage.filters.length,
        mergedOrder: merged.columnOrder.length
      });
    }
  }, [debugScope, isDebugMode, tableId, storageKeyValue]);

  useEffect(() => {
    if (!hasHydrated.current || typeof window === "undefined") {
      return;
    }

    if (urlTimer.current !== null) {
      window.clearTimeout(urlTimer.current);
    }

    urlTimer.current = window.setTimeout(() => {
      const current = new URLSearchParams(window.location.search);
      const next = encodePersistedStateToUrl(tableId, state, current);
      const nextQuery = next.toString();
      const nextUrl = `${window.location.pathname}${nextQuery.length > 0 ? `?${nextQuery}` : ""}`;
      try {
        window.history.replaceState(null, "", nextUrl);
      } catch {
        const currentOnError = onErrorRef.current;
        if (currentOnError) {
          currentOnError("Failed to persist table state to URL");
        }
        if (isDebugMode) {
          pushDebugEvent(debugScope, "replaceState failed", {
            queryLength: nextQuery.length
          });
        }
        return;
      }

      if (!isDebugMode) {
        return;
      }

      const now = performance.now();
      urlWrites.current.push(now);
      while (urlWrites.current.length > 0 && now - (urlWrites.current[0] ?? now) > 2000) {
        urlWrites.current.shift();
      }

      pushDebugEventThrottled(debugScope, "url-write", 250, "persisted URL state", {
        queryLength: nextQuery.length,
        sorting: state.sorting.length,
        filters: state.filters.length,
        widths: Object.keys(state.widths).length
      });

      if (urlWrites.current.length > 24) {
        pushDebugEventThrottled(debugScope, "url-write-storm", 1000, "high URL write rate", {
          writes2s: urlWrites.current.length
        });
      }
    }, URL_WRITE_DEBOUNCE_MS);

    return () => {
      if (urlTimer.current !== null) {
        window.clearTimeout(urlTimer.current);
      }
    };
  }, [debugScope, isDebugMode, tableId, state]);

  useEffect(() => {
    if (!hasHydrated.current || typeof window === "undefined") {
      return;
    }

    if (storageTimer.current !== null) {
      window.clearTimeout(storageTimer.current);
    }

    storageTimer.current = window.setTimeout(() => {
      writePersistedState(storageKeyValue, state, onErrorRef.current);

      if (!isDebugMode) {
        return;
      }

      const now = performance.now();
      storageWrites.current.push(now);
      while (storageWrites.current.length > 0 && now - (storageWrites.current[0] ?? now) > 2000) {
        storageWrites.current.shift();
      }

      pushDebugEventThrottled(debugScope, "storage-write", 250, "persisted localStorage state", {
        sorting: state.sorting.length,
        filters: state.filters.length,
        widths: Object.keys(state.widths).length
      });

      if (storageWrites.current.length > 24) {
        pushDebugEventThrottled(debugScope, "storage-write-storm", 1000, "high storage write rate", {
          writes2s: storageWrites.current.length
        });
      }
    }, STORAGE_WRITE_DEBOUNCE_MS);

    return () => {
      if (storageTimer.current !== null) {
        window.clearTimeout(storageTimer.current);
      }
    };
  }, [debugScope, isDebugMode, state, storageKeyValue]);
}
