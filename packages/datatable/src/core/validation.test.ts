import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateCell, validateRow } from "./validation";
import type { DataTableColumn } from "./types";

type Row = {
  id: string;
  title: string;
  amount: number;
};

const titleColumn: DataTableColumn<Row> = {
  id: "title",
  field: "title",
  header: "Title",
  kind: "text",
  isEditable: true,
  validator: (value) => (value.trim().length > 0 ? null : "Title required")
};

describe("validation", () => {
  it("validates cell-level rules", () => {
    expect(validateCell(titleColumn, { id: "1", title: "ok", amount: 4 }, "")).toEqual({
      ok: false,
      message: "Title required"
    });

    expect(validateCell(titleColumn, { id: "1", title: "ok", amount: 4 }, "draft")).toEqual({
      ok: true,
      message: null
    });
  });

  it("validates row schema", () => {
    const schema = z.object({
      id: z.string(),
      title: z.string().min(1),
      amount: z.number().min(0)
    });

    expect(validateRow(schema, { id: "1", title: "ok", amount: 2 }).ok).toBe(true);
    expect(validateRow(schema, { id: "1", title: "", amount: -1 }).ok).toBe(false);
  });
});
