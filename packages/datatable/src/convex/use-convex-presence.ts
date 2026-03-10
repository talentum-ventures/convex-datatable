import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  CollaboratorCellCoord,
  CollaboratorPresence,
  ConvexPresenceConfig,
  ConvexPresenceEntry
} from "../core/types";

const DEFAULT_PRESENCE_DEBOUNCE_MS = 150;
const DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS = 10_000;

const PRESENCE_COLOR_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5"
] as const;

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function resolvePresenceColor(userId: string, explicitColor?: string): string {
  if (explicitColor) {
    return explicitColor;
  }

  const index = hashString(userId) % PRESENCE_COLOR_PALETTE.length;
  return PRESENCE_COLOR_PALETTE[index] ?? PRESENCE_COLOR_PALETTE[0];
}

export function toCollaboratorPresence(
  entries: ReadonlyArray<ConvexPresenceEntry>,
  localUserId: string
): ReadonlyArray<CollaboratorPresence> {
  return entries
    .filter((entry) => entry.userId !== localUserId)
    .map((entry) => ({
      userId: entry.userId,
      name: entry.userName,
      color: resolvePresenceColor(entry.userId, entry.userColor),
      activeCell:
        entry.activeRowId !== null && entry.activeColumnId !== null
          ? {
              rowId: entry.activeRowId,
              columnId: entry.activeColumnId
            }
          : null
    }));
}

function isSameActiveCell(
  left: CollaboratorPresence["activeCell"],
  right: CollaboratorPresence["activeCell"]
): boolean {
  return left?.rowId === right?.rowId && left?.columnId === right?.columnId;
}

function areCollaboratorsEqual(
  left: ReadonlyArray<CollaboratorPresence>,
  right: ReadonlyArray<CollaboratorPresence>
): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftCollaborator = left[index];
    const rightCollaborator = right[index];
    if (
      !leftCollaborator ||
      !rightCollaborator ||
      leftCollaborator.userId !== rightCollaborator.userId ||
      leftCollaborator.name !== rightCollaborator.name ||
      leftCollaborator.color !== rightCollaborator.color ||
      !isSameActiveCell(leftCollaborator.activeCell, rightCollaborator.activeCell)
    ) {
      return false;
    }
  }

  return true;
}

export function buildPresenceEntry(args: {
  tableId: string;
  userId: string;
  userName: string;
  userColor: string | undefined;
  activeCell: CollaboratorCellCoord | null;
  now?: number;
}): ConvexPresenceEntry {
  const { tableId, userId, userName, userColor, activeCell, now = Date.now() } = args;

  return {
    tableId,
    userId,
    userName,
    userColor: resolvePresenceColor(userId, userColor),
    activeRowId: activeCell?.rowId ?? null,
    activeColumnId: activeCell?.columnId ?? null,
    lastSeen: now
  };
}

export function useConvexPresence(
  config: ConvexPresenceConfig
): {
  collaborators: ReadonlyArray<CollaboratorPresence>;
  onActiveCellChange: (cell: CollaboratorCellCoord | null) => void;
} {
  const {
    tableId,
    userId,
    userName,
    userColor,
    usePresenceData,
    sendHeartbeat,
    debounceMs = DEFAULT_PRESENCE_DEBOUNCE_MS,
    heartbeatIntervalMs = DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS
  } = config;

  const activeCellRef = useRef<CollaboratorCellCoord | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendHeartbeatRef = useRef(sendHeartbeat);
  const rawPresenceEntries = usePresenceData(tableId);

  sendHeartbeatRef.current = sendHeartbeat;

  const mappedCollaborators = useMemo(
    () => toCollaboratorPresence(rawPresenceEntries, userId),
    [rawPresenceEntries, userId]
  );
  const collaboratorsRef = useRef(mappedCollaborators);

  if (!areCollaboratorsEqual(collaboratorsRef.current, mappedCollaborators)) {
    collaboratorsRef.current = mappedCollaborators;
  }

  const collaborators = collaboratorsRef.current;

  const flushHeartbeat = useCallback(() => {
    const entry = buildPresenceEntry({
      tableId,
      userId,
      userName,
      userColor,
      activeCell: activeCellRef.current
    });

    void sendHeartbeatRef.current(entry);
  }, [tableId, userColor, userId, userName]);

  const onActiveCellChange = useCallback(
    (cell: CollaboratorCellCoord | null) => {
      activeCellRef.current = cell;

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        flushHeartbeat();
      }, debounceMs);
    },
    [debounceMs, flushHeartbeat]
  );

  useEffect(() => {
    flushHeartbeat();

    const heartbeatTimer = setInterval(() => {
      flushHeartbeat();
    }, heartbeatIntervalMs);

    return () => {
      clearInterval(heartbeatTimer);
    };
  }, [flushHeartbeat, heartbeatIntervalMs]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    collaborators,
    onActiveCellChange
  };
}
