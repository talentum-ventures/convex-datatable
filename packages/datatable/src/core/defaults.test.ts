import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, DEFAULT_PAGE_SIZE, DEFAULT_THEME_TOKENS } from "./defaults";

describe("defaults", () => {
  it("uses productive-safe feature profile", () => {
    expect(DEFAULT_FEATURE_FLAGS.columnResize).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.rowResize).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.columnReorder).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.columnPinning).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.columnVisibility).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.columnFilter).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.columnSort).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.rowSelect).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.rowActions).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.cellSelect).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.clipboardCopy).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.infiniteScroll).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.virtualization).toBe(true);

    expect(DEFAULT_FEATURE_FLAGS.rowAdd).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.rowDelete).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.editing).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.clipboardPaste).toBe(false);
  });

  it("defaults infinite page size to 50", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(50);
  });

  it("includes pinned surface theme tokens", () => {
    expect(DEFAULT_THEME_TOKENS.pinnedHeaderBg).toMatch(/^linear-gradient/);
    expect(DEFAULT_THEME_TOKENS.pinnedRowBg).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.pinnedRowHoverBg).toBeTruthy();
  });
});
