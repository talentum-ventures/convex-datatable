import { useEffect, useMemo, useRef } from "react";
import {
  STORAGE_WRITE_DEBOUNCE_MS,
  URL_WRITE_DEBOUNCE_MS
} from "../core/defaults";
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
  const storageKeyValue = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return storageKey(window.location.pathname, tableId);
  }, [tableId]);

  const hasHydrated = useRef(false);
  const urlTimer = useRef<number | null>(null);
  const storageTimer = useRef<number | null>(null);
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
  }, [tableId, storageKeyValue]);

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
        return;
      }
    }, URL_WRITE_DEBOUNCE_MS);

    return () => {
      if (urlTimer.current !== null) {
        window.clearTimeout(urlTimer.current);
      }
    };
  }, [tableId, state]);

  useEffect(() => {
    if (!hasHydrated.current || typeof window === "undefined") {
      return;
    }

    if (storageTimer.current !== null) {
      window.clearTimeout(storageTimer.current);
    }

    storageTimer.current = window.setTimeout(() => {
      writePersistedState(storageKeyValue, state, onErrorRef.current);
    }, STORAGE_WRITE_DEBOUNCE_MS);

    return () => {
      if (storageTimer.current !== null) {
        window.clearTimeout(storageTimer.current);
      }
    };
  }, [state, storageKeyValue]);
}
