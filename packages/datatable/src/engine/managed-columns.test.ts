import { describe, expect, it } from "vitest";
import {
  ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
  buildManagedColumnOrder,
  buildManagedColumnPinning,
  reorderDataColumnsByPinZone,
  sanitizeDataColumnOrder,
  sanitizeDataColumnPinning
} from "./managed-columns";

describe("managed columns", () => {
  it("strips managed utility columns from persisted data order", () => {
    expect(
      sanitizeDataColumnOrder({
        dataColumnIds: ["title", "status", "amount"],
        userColumnOrder: [SELECT_COLUMN_ID, "status", ACTIONS_COLUMN_ID, "title"]
      })
    ).toEqual(["status", "title", "amount"]);
  });

  it("keeps the select column first and actions column last in the rebuilt order", () => {
    expect(
      buildManagedColumnOrder({
        dataColumnIds: ["title", "status", "amount"],
        userColumnOrder: ["status", "title", "amount"],
        includeSelect: true,
        includeActions: true
      })
    ).toEqual([SELECT_COLUMN_ID, "status", "title", "amount", ACTIONS_COLUMN_ID]);
  });

  it("strips managed utility columns from persisted pinning", () => {
    expect(
      sanitizeDataColumnPinning({
        dataColumnIds: ["title", "status", "amount"],
        userColumnPinning: {
          left: [SELECT_COLUMN_ID, "title"],
          right: ["amount", ACTIONS_COLUMN_ID]
        }
      })
    ).toEqual({
      left: ["title"],
      right: ["amount"]
    });
  });

  it("keeps a data column pinned on only one side when persisted pinning is inconsistent", () => {
    expect(
      sanitizeDataColumnPinning({
        dataColumnIds: ["title", "status", "amount"],
        userColumnPinning: {
          left: ["title", "status"],
          right: ["status", "amount"]
        }
      })
    ).toEqual({
      left: ["title", "status"],
      right: ["amount"]
    });
  });

  it("rebuilds managed pinning with select first and actions last", () => {
    expect(
      buildManagedColumnPinning({
        dataColumnIds: ["title", "status", "amount"],
        userColumnPinning: {
          left: ["title"],
          right: ["amount"]
        },
        includeSelect: true,
        includeActions: true
      })
    ).toEqual({
      left: [SELECT_COLUMN_ID, "title"],
      right: ["amount", ACTIONS_COLUMN_ID]
    });
  });

  it("omits utility columns when those features are disabled", () => {
    expect(
      buildManagedColumnPinning({
        dataColumnIds: ["title", "status"],
        userColumnPinning: {
          left: ["title"],
          right: ["status"]
        },
        includeSelect: false,
        includeActions: false
      })
    ).toEqual({
      left: ["title"],
      right: ["status"]
    });
  });

  it("reorders two left-pinned columns and updates both order and pinning", () => {
    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: ["title", "status"],
          right: []
        },
        sourceColumnId: "status",
        targetColumnId: "title",
        placement: "before"
      })
    ).toEqual({
      columnOrder: ["status", "title", "amount"],
      columnPinning: {
        left: ["status", "title"],
        right: []
      },
      changed: true
    });
  });

  it("reorders two right-pinned columns and updates both order and pinning", () => {
    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: [],
          right: ["status", "amount"]
        },
        sourceColumnId: "amount",
        targetColumnId: "status",
        placement: "before"
      })
    ).toEqual({
      columnOrder: ["title", "amount", "status"],
      columnPinning: {
        left: [],
        right: ["amount", "status"]
      },
      changed: true
    });
  });

  it("reorders center columns without changing pinning", () => {
    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: ["title"],
          right: []
        },
        sourceColumnId: "amount",
        targetColumnId: "status",
        placement: "before"
      })
    ).toEqual({
      columnOrder: ["title", "amount", "status"],
      columnPinning: {
        left: ["title"],
        right: []
      },
      changed: true
    });
  });

  it("ignores reorders across pin zones", () => {
    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: ["title"],
          right: []
        },
        sourceColumnId: "title",
        targetColumnId: "status",
        placement: "after"
      })
    ).toEqual({
      columnOrder: ["title", "status", "amount"],
      columnPinning: {
        left: ["title"],
        right: []
      },
      changed: false
    });
  });

  it("leaves state unchanged when the ids are missing or identical", () => {
    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: ["title"],
          right: []
        },
        sourceColumnId: "title",
        targetColumnId: "title",
        placement: "before"
      })
    ).toEqual({
      columnOrder: ["title", "status", "amount"],
      columnPinning: {
        left: ["title"],
        right: []
      },
      changed: false
    });

    expect(
      reorderDataColumnsByPinZone({
        columnOrder: ["title", "status", "amount"],
        columnPinning: {
          left: ["title"],
          right: []
        },
        sourceColumnId: "missing",
        targetColumnId: "status",
        placement: "before"
      })
    ).toEqual({
      columnOrder: ["title", "status", "amount"],
      columnPinning: {
        left: ["title"],
        right: []
      },
      changed: false
    });
  });

  it("preserves managed-column invariants after rebuilding order and pinning", () => {
    const reordered = reorderDataColumnsByPinZone({
      columnOrder: ["title", "status", "amount"],
      columnPinning: {
        left: ["title", "status"],
        right: ["amount"]
      },
      sourceColumnId: "status",
      targetColumnId: "title",
      placement: "before"
    });

    expect(
      buildManagedColumnOrder({
        dataColumnIds: reordered.columnOrder,
        userColumnOrder: reordered.columnOrder,
        includeSelect: true,
        includeActions: true
      })
    ).toEqual([SELECT_COLUMN_ID, "status", "title", "amount", ACTIONS_COLUMN_ID]);

    expect(
      buildManagedColumnPinning({
        dataColumnIds: reordered.columnOrder,
        userColumnPinning: reordered.columnPinning,
        includeSelect: true,
        includeActions: true
      })
    ).toEqual({
      left: [SELECT_COLUMN_ID, "status", "title"],
      right: ["amount", ACTIONS_COLUMN_ID]
    });
  });
});
