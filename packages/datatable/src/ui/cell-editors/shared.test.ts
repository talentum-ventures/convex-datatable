import { describe, expect, it } from "vitest";
import { editorOverflowsCell } from "./shared";

describe("editorOverflowsCell", () => {
  it("only lets popover editors escape the cell", () => {
    expect(editorOverflowsCell("select")).toBe(true);
    expect(editorOverflowsCell("multiselect")).toBe(true);
    expect(editorOverflowsCell("date")).toBe(true);
    expect(editorOverflowsCell("text")).toBe(false);
    expect(editorOverflowsCell("longText")).toBe(false);
    expect(editorOverflowsCell("number")).toBe(false);
    expect(editorOverflowsCell("currency")).toBe(false);
    expect(editorOverflowsCell("link")).toBe(false);
  });
});
