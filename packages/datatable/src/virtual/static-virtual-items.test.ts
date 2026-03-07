import { describe, expect, it } from "vitest";
import { buildStaticVirtualItems, getStaticVirtualTotalHeight } from "./static-virtual-items";

describe("static virtual items", () => {
  it("positions items cumulatively from measured row heights", () => {
    const sizes = [79, 40, 96];

    const items = buildStaticVirtualItems({
      count: sizes.length,
      getSize: (index) => sizes[index] ?? 0
    });

    expect(items).toEqual([
      { key: 0, index: 0, start: 0, size: 79, end: 79, lane: 0 },
      { key: 1, index: 1, start: 79, size: 40, end: 119, lane: 0 },
      { key: 2, index: 2, start: 119, size: 96, end: 215, lane: 0 }
    ]);
    expect(getStaticVirtualTotalHeight(items)).toBe(215);
  });

  it("returns zero total height when there are no items", () => {
    expect(getStaticVirtualTotalHeight([])).toBe(0);
  });
});
