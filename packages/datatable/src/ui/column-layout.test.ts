import { describe, expect, it } from "vitest";
import { computeColumnLayout, type ColumnLayoutInput } from "./column-layout";

function layout(columns: ReadonlyArray<ColumnLayoutInput>, containerWidth: number) {
  return computeColumnLayout({
    columns,
    containerWidth
  });
}

describe("column layout", () => {
  it("keeps base widths when no extra space is available", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "name",
        baseWidth: 180,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "status",
        baseWidth: 120,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      }
    ];

    const result = layout(columns, 300);
    expect(result.renderWidthsById).toEqual({
      name: 180,
      status: 120
    });
    expect(result.tableRenderWidth).toBe(300);
  });

  it("distributes extra width proportionally and preserves the exact sum", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "name",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "description",
        baseWidth: 200,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      }
    ];

    const result = layout(columns, 450);
    expect(result.renderWidthsById).toEqual({
      name: 150,
      description: 300
    });
    expect(result.tableRenderWidth).toBe(450);
  });

  it("uses deterministic largest-remainder tie breaking by visible order", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "a",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "b",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "c",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      }
    ];

    const result = layout(columns, 304);
    expect(result.renderWidthsById).toEqual({
      a: 102,
      b: 101,
      c: 101
    });
    expect(result.tableRenderWidth).toBe(304);
  });

  it("respects max width caps and redistributes leftover space", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "name",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: 110
      },
      {
        id: "description",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      }
    ];

    const result = layout(columns, 260);
    expect(result.renderWidthsById).toEqual({
      name: 110,
      description: 150
    });
    expect(result.tableRenderWidth).toBe(260);
  });

  it("fills only resizable data columns", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "name",
        baseWidth: 100,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "__select__",
        baseWidth: 44,
        pinned: "left",
        isDataColumn: false,
        canResize: true,
        maxWidth: 44
      },
      {
        id: "__actions__",
        baseWidth: 65,
        pinned: "right",
        isDataColumn: false,
        canResize: true,
        maxWidth: 65
      },
      {
        id: "locked",
        baseWidth: 120,
        pinned: "center",
        isDataColumn: true,
        canResize: false,
        maxWidth: null
      }
    ];

    const result = layout(columns, 436);
    expect(result.renderWidthsById).toEqual({
      name: 207,
      __select__: 44,
      __actions__: 65,
      locked: 120
    });
    expect(result.tableRenderWidth).toBe(436);
  });

  it("keeps base width when there are no eligible fill columns", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "__select__",
        baseWidth: 44,
        pinned: "left",
        isDataColumn: false,
        canResize: true,
        maxWidth: 44
      },
      {
        id: "locked",
        baseWidth: 140,
        pinned: "center",
        isDataColumn: true,
        canResize: false,
        maxWidth: null
      },
      {
        id: "__actions__",
        baseWidth: 65,
        pinned: "right",
        isDataColumn: false,
        canResize: true,
        maxWidth: 65
      }
    ];

    const result = layout(columns, 700);
    expect(result.renderWidthsById).toEqual({
      __select__: 44,
      locked: 140,
      __actions__: 65
    });
    expect(result.tableRenderWidth).toBe(249);
  });

  it("computes pinned offsets from render widths", () => {
    const columns: ReadonlyArray<ColumnLayoutInput> = [
      {
        id: "__select__",
        baseWidth: 44,
        pinned: "left",
        isDataColumn: false,
        canResize: true,
        maxWidth: 44
      },
      {
        id: "name",
        baseWidth: 160,
        pinned: "left",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "status",
        baseWidth: 120,
        pinned: "center",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "website",
        baseWidth: 180,
        pinned: "right",
        isDataColumn: true,
        canResize: true,
        maxWidth: null
      },
      {
        id: "__actions__",
        baseWidth: 65,
        pinned: "right",
        isDataColumn: false,
        canResize: true,
        maxWidth: 65
      }
    ];

    const result = layout(columns, 569);
    expect(result.leftPinnedOffsetById).toEqual({
      __select__: 0,
      name: 44
    });
    expect(result.rightPinnedOffsetById).toEqual({
      __actions__: 0,
      website: 65
    });
  });
});
