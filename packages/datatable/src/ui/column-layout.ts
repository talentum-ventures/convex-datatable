type PinnedSide = "left" | "center" | "right";

export type ColumnLayoutInput = {
  id: string;
  baseWidth: number;
  pinned: PinnedSide;
  isDataColumn: boolean;
  canResize: boolean;
  maxWidth: number | null;
};

export type ColumnLayoutResult = {
  renderWidthsById: Readonly<Record<string, number>>;
  tableRenderWidth: number;
  leftPinnedOffsetById: Readonly<Record<string, number>>;
  rightPinnedOffsetById: Readonly<Record<string, number>>;
  firstRightPinnedColumnId: string | null;
};

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function normalizeMaxWidth(maxWidth: number | null, minWidth: number): number | null {
  if (maxWidth === null) {
    return null;
  }
  const normalized = toNonNegativeInteger(maxWidth);
  return normalized < minWidth ? minWidth : normalized;
}

function capacityRemaining(currentWidth: number, maxWidth: number | null): number {
  if (maxWidth === null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(0, maxWidth - currentWidth);
}

export function computeColumnLayout(args: {
  columns: ReadonlyArray<ColumnLayoutInput>;
  containerWidth: number;
}): ColumnLayoutResult {
  const { columns } = args;
  const containerWidth = toNonNegativeInteger(args.containerWidth);
  const widths = columns.map((column) => toNonNegativeInteger(column.baseWidth));
  const maxWidths = columns.map((column, index) => normalizeMaxWidth(column.maxWidth, widths[index] ?? 0));

  let baseTotal = 0;
  for (const width of widths) {
    baseTotal += width;
  }

  let remainingExtra = Math.max(0, containerWidth - baseTotal);

  while (remainingExtra > 0) {
    const activeIndices: number[] = [];
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      if (!column) {
        continue;
      }
      if (!column.isDataColumn || !column.canResize) {
        continue;
      }
      const currentWidth = widths[index] ?? 0;
      const maxWidth = maxWidths[index] ?? null;
      if (capacityRemaining(currentWidth, maxWidth) <= 0) {
        continue;
      }
      activeIndices.push(index);
    }

    if (activeIndices.length === 0) {
      break;
    }

    let totalWeight = 0;
    for (const index of activeIndices) {
      totalWeight += Math.max(1, widths[index] ?? 0);
    }
    if (totalWeight <= 0) {
      break;
    }

    const allocations = new Array<number>(columns.length).fill(0);
    const remainders: Array<{ index: number; remainder: number }> = [];
    let assigned = 0;

    for (const index of activeIndices) {
      const currentWidth = widths[index] ?? 0;
      const maxWidth = maxWidths[index] ?? null;
      const maxCapacity = capacityRemaining(currentWidth, maxWidth);
      if (maxCapacity <= 0) {
        continue;
      }

      const weight = Math.max(1, currentWidth);
      const rawShare = (remainingExtra * weight) / totalWeight;
      const floorShare = Math.floor(rawShare);
      const boundedFloor = Math.min(maxCapacity, floorShare);
      allocations[index] = boundedFloor;
      assigned += boundedFloor;

      const nextCapacity = maxCapacity - boundedFloor;
      if (nextCapacity > 0) {
        remainders.push({
          index,
          remainder: rawShare - floorShare
        });
      }
    }

    let leftovers = remainingExtra - assigned;
    if (leftovers > 0 && remainders.length > 0) {
      remainders.sort((left, right) => {
        if (right.remainder !== left.remainder) {
          return right.remainder - left.remainder;
        }
        return left.index - right.index;
      });

      while (leftovers > 0) {
        let assignedThisPass = 0;

        for (const remainderEntry of remainders) {
          if (leftovers === 0) {
            break;
          }
          const index = remainderEntry.index;
          const currentWidth = widths[index] ?? 0;
          const maxWidth = maxWidths[index] ?? null;
          const afterFloorWidth = currentWidth + (allocations[index] ?? 0);
          if (capacityRemaining(afterFloorWidth, maxWidth) <= 0) {
            continue;
          }
          allocations[index] = (allocations[index] ?? 0) + 1;
          leftovers -= 1;
          assignedThisPass += 1;
        }

        if (assignedThisPass === 0) {
          break;
        }
      }

      const remainderAssigned = remainingExtra - assigned - leftovers;
      assigned += remainderAssigned;
    }

    if (assigned <= 0) {
      break;
    }

    for (let index = 0; index < allocations.length; index += 1) {
      widths[index] = (widths[index] ?? 0) + (allocations[index] ?? 0);
    }
    remainingExtra -= assigned;
  }

  const renderWidthsById: Record<string, number> = {};
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column) {
      continue;
    }
    renderWidthsById[column.id] = widths[index] ?? 0;
  }

  let tableRenderWidth = 0;
  for (const width of widths) {
    tableRenderWidth += width;
  }

  const leftPinnedOffsetById: Record<string, number> = {};
  let leftOffset = 0;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column || column.pinned !== "left") {
      continue;
    }
    leftPinnedOffsetById[column.id] = leftOffset;
    leftOffset += widths[index] ?? 0;
  }

  const rightPinnedOffsetById: Record<string, number> = {};
  let rightOffset = 0;
  let firstRightPinnedColumnId: string | null = null;
  for (let index = columns.length - 1; index >= 0; index -= 1) {
    const column = columns[index];
    if (!column || column.pinned !== "right") {
      continue;
    }
    rightPinnedOffsetById[column.id] = rightOffset;
    rightOffset += widths[index] ?? 0;
    firstRightPinnedColumnId = column.id;
  }

  return {
    renderWidthsById,
    tableRenderWidth,
    leftPinnedOffsetById,
    rightPinnedOffsetById,
    firstRightPinnedColumnId
  };
}
