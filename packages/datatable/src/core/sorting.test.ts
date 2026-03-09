import { describe, expect, it } from "vitest";
import { comparableSortValue, compareValues } from "./sorting";

describe("sorting", () => {
  it("normalizes mixed cell values into sortable values", () => {
    expect(comparableSortValue("alpha")).toBe("alpha");
    expect(comparableSortValue(42)).toBe(42);
    expect(comparableSortValue(["a", "b"])).toBe("a,b");
    expect(comparableSortValue(null)).toBe(null);
    expect(typeof comparableSortValue(new Date("2026-03-05T00:00:00.000Z"))).toBe("number");
  });

  it("compares primitive values deterministically", () => {
    expect(compareValues(null, "a")).toBeLessThan(0);
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues("b", "a")).toBeGreaterThan(0);
    expect(compareValues(true, true)).toBe(0);
  });
});
