import { useCallback, useMemo, useRef } from "react";
import type { RowId } from "../core/types";

export function useRowObservers(): {
  connect: (rowId: RowId, node: HTMLTableRowElement | null, onResize: (height: number) => void) => void;
  disconnectAll: () => void;
} {
  const observers = useRef<Record<RowId, ResizeObserver>>({});
  const nodes = useRef<Record<RowId, HTMLTableRowElement | null>>({});

  const connect = useCallback(
    (rowId: RowId, node: HTMLTableRowElement | null, onResize: (height: number) => void) => {
      const currentNode = nodes.current[rowId] ?? null;
      if (node === currentNode) {
        return;
      }

      const existing = observers.current[rowId];

      if (!node) {
        if (currentNode && currentNode.isConnected) {
          return;
        }

        if (existing) {
          existing.disconnect();
          delete observers.current[rowId];
        }
        delete nodes.current[rowId];
        return;
      }

      if (existing) {
        existing.disconnect();
        delete observers.current[rowId];
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        onResize(entry.contentRect.height);
      });

      observer.observe(node);
      observers.current[rowId] = observer;
      nodes.current[rowId] = node;
    },
    []
  );

  const disconnectAll = useCallback(() => {
    for (const observer of Object.values(observers.current)) {
      observer.disconnect();
    }
    observers.current = {};
    nodes.current = {};
  }, []);

  return useMemo(
    () => ({
      connect,
      disconnectAll
    }),
    [connect, disconnectAll]
  );
}
