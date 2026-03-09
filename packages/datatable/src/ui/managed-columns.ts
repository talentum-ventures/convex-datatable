import type { ColumnPinningState } from "@tanstack/react-table";

export const SELECT_COLUMN_ID = "__select__";
export const ACTIONS_COLUMN_ID = "__actions__";

const MANAGED_COLUMN_IDS = new Set([SELECT_COLUMN_ID, ACTIONS_COLUMN_ID]);
type PinZone = "left" | "center" | "right";

type ManagedColumnOrderArgs = {
  dataColumnIds: ReadonlyArray<string>;
  userColumnOrder: ReadonlyArray<string>;
  includeSelect: boolean;
  includeActions: boolean;
};

type ManagedColumnPinningArgs = {
  dataColumnIds: ReadonlyArray<string>;
  userColumnPinning: ColumnPinningState;
  includeSelect: boolean;
  includeActions: boolean;
};

type DataColumnReorderByPinZoneArgs = {
  columnOrder: ReadonlyArray<string>;
  columnPinning: ColumnPinningState;
  sourceColumnId: string;
  targetColumnId: string;
  placement: "before" | "after";
};

type DataColumnReorderByPinZoneResult = {
  columnOrder: string[];
  columnPinning: ColumnPinningState;
  changed: boolean;
};

export function isManagedUtilityColumnId(columnId: string): boolean {
  return MANAGED_COLUMN_IDS.has(columnId);
}

export function stripManagedColumnIds(ids: ReadonlyArray<string>): string[] {
  return ids.filter((columnId) => !isManagedUtilityColumnId(columnId));
}

function sanitizePinnedIds(ids: ReadonlyArray<string>, allowedIds: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const columnId of stripManagedColumnIds(ids)) {
    if (!allowedIds.has(columnId) || seen.has(columnId)) {
      continue;
    }

    seen.add(columnId);
    sanitized.push(columnId);
  }

  return sanitized;
}

function reorderIds(
  ids: ReadonlyArray<string>,
  sourceId: string,
  targetId: string,
  placement: "before" | "after"
): string[] {
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return [...ids];
  }

  const next = [...ids];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return [...ids];
  }

  const nextTargetIndex = next.indexOf(targetId);
  if (nextTargetIndex < 0) {
    return [...ids];
  }

  const insertIndex = placement === "before" ? nextTargetIndex : nextTargetIndex + 1;
  next.splice(insertIndex, 0, moved);
  return next;
}

function pinZoneForDataColumnId(columnId: string, pinning: ColumnPinningState): PinZone {
  if ((pinning.left ?? []).includes(columnId)) {
    return "left";
  }
  if ((pinning.right ?? []).includes(columnId)) {
    return "right";
  }
  return "center";
}

export function sanitizeDataColumnOrder({
  dataColumnIds,
  userColumnOrder
}: Pick<ManagedColumnOrderArgs, "dataColumnIds" | "userColumnOrder">): string[] {
  const allowedIds = new Set(dataColumnIds);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const columnId of stripManagedColumnIds(userColumnOrder)) {
    if (!allowedIds.has(columnId) || seen.has(columnId)) {
      continue;
    }

    seen.add(columnId);
    ordered.push(columnId);
  }

  for (const columnId of dataColumnIds) {
    if (seen.has(columnId)) {
      continue;
    }

    seen.add(columnId);
    ordered.push(columnId);
  }

  return ordered;
}

export function sanitizeDataColumnPinning({
  dataColumnIds,
  userColumnPinning
}: Pick<ManagedColumnPinningArgs, "dataColumnIds" | "userColumnPinning">): ColumnPinningState {
  const allowedIds = new Set(dataColumnIds);
  const left = sanitizePinnedIds(userColumnPinning.left ?? [], allowedIds);
  const leftIds = new Set(left);
  const right = sanitizePinnedIds(userColumnPinning.right ?? [], allowedIds).filter(
    (columnId) => !leftIds.has(columnId)
  );

  return {
    left,
    right
  };
}

export function reorderDataColumnsByPinZone({
  columnOrder,
  columnPinning,
  sourceColumnId,
  targetColumnId,
  placement
}: DataColumnReorderByPinZoneArgs): DataColumnReorderByPinZoneResult {
  const sanitizedColumnOrder = sanitizeDataColumnOrder({
    dataColumnIds: columnOrder,
    userColumnOrder: columnOrder
  });
  const sanitizedColumnPinning = sanitizeDataColumnPinning({
    dataColumnIds: sanitizedColumnOrder,
    userColumnPinning: columnPinning
  });

  if (sourceColumnId === targetColumnId) {
    return {
      columnOrder: sanitizedColumnOrder,
      columnPinning: sanitizedColumnPinning,
      changed: false
    };
  }

  const sourceZone = pinZoneForDataColumnId(sourceColumnId, sanitizedColumnPinning);
  const targetZone = pinZoneForDataColumnId(targetColumnId, sanitizedColumnPinning);
  if (sourceZone !== targetZone) {
    return {
      columnOrder: sanitizedColumnOrder,
      columnPinning: sanitizedColumnPinning,
      changed: false
    };
  }

  const nextColumnOrder = reorderIds(sanitizedColumnOrder, sourceColumnId, targetColumnId, placement);
  const columnOrderChanged = nextColumnOrder.some((columnId, index) => columnId !== sanitizedColumnOrder[index]);

  if (sourceZone === "center") {
    return {
      columnOrder: nextColumnOrder,
      columnPinning: sanitizedColumnPinning,
      changed: columnOrderChanged
    };
  }

  const sourcePinnedIds =
    sourceZone === "left" ? sanitizedColumnPinning.left ?? [] : sanitizedColumnPinning.right ?? [];
  const nextPinnedIds = reorderIds(sourcePinnedIds, sourceColumnId, targetColumnId, placement);
  const pinningChanged = nextPinnedIds.some((columnId, index) => columnId !== sourcePinnedIds[index]);

  if (!columnOrderChanged && !pinningChanged) {
    return {
      columnOrder: sanitizedColumnOrder,
      columnPinning: sanitizedColumnPinning,
      changed: false
    };
  }

  return {
    columnOrder: nextColumnOrder,
    columnPinning:
      sourceZone === "left"
        ? {
            left: nextPinnedIds,
            right: sanitizedColumnPinning.right ?? []
          }
        : {
            left: sanitizedColumnPinning.left ?? [],
            right: nextPinnedIds
          },
    changed: true
  };
}

export function buildManagedColumnOrder({
  dataColumnIds,
  userColumnOrder,
  includeSelect,
  includeActions
}: ManagedColumnOrderArgs): string[] {
  const orderedDataColumnIds = sanitizeDataColumnOrder({
    dataColumnIds,
    userColumnOrder
  });
  const output: string[] = [];

  if (includeSelect) {
    output.push(SELECT_COLUMN_ID);
  }

  output.push(...orderedDataColumnIds);

  if (includeActions) {
    output.push(ACTIONS_COLUMN_ID);
  }

  return output;
}

export function buildManagedColumnPinning({
  dataColumnIds,
  userColumnPinning,
  includeSelect,
  includeActions
}: ManagedColumnPinningArgs): ColumnPinningState {
  const sanitizedPinning = sanitizeDataColumnPinning({
    dataColumnIds,
    userColumnPinning
  });
  const left = [...(sanitizedPinning.left ?? [])];
  const right = [...(sanitizedPinning.right ?? [])];

  if (includeSelect) {
    left.unshift(SELECT_COLUMN_ID);
  }

  if (includeActions) {
    right.push(ACTIONS_COLUMN_ID);
  }

  return {
    left,
    right
  };
}
