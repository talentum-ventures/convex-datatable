/// <reference types="@testing-library/cypress" />

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn, type DataTableDataSource } from "@rolha/datatable";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  amount: number;
  website?: string;
};

const columns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    isEditable: true
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ],
    isEditable: true
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    isEditable: true
  }
];

const alignmentColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 160
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    width: 140,
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ]
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    width: 120
  }
];

const linkOverflowColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 120
  },
  {
    id: "website",
    field: "website",
    header: "Website",
    kind: "link",
    width: 120
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    width: 100
  }
];

function assertHeaderBodyColumnAlignment(columnId: string, rowId: string): void {
  cy.get(`th[data-column-id='${columnId}']`)
    .first()
    .then(($headerCell) => {
      const headerRect = $headerCell[0].getBoundingClientRect();

      cy.get(`tr[data-row-id='${rowId}'] [role='gridcell'][data-column-id='${columnId}']`)
        .first()
        .closest("td")
        .then(($bodyCell) => {
          const bodyRect = $bodyCell[0].getBoundingClientRect();
          expect(Math.abs(headerRect.left - bodyRect.left), `${columnId} left edge alignment`).to.be.lte(1);
          expect(Math.abs(headerRect.right - bodyRect.right), `${columnId} right edge alignment`).to.be.lte(1);
          expect(Math.abs(headerRect.width - bodyRect.width), `${columnId} width alignment`).to.be.lte(1);
        });
    });
}

function assertBodyColumnWidthConsistency(columnId: string, firstRowId: string, secondRowId: string): void {
  cy.get(`tr[data-row-id='${firstRowId}'] [role='gridcell'][data-column-id='${columnId}']`)
    .first()
    .closest("td")
    .then(($firstBodyCell) => {
      const firstRect = $firstBodyCell[0].getBoundingClientRect();

      cy.get(`tr[data-row-id='${secondRowId}'] [role='gridcell'][data-column-id='${columnId}']`)
        .first()
        .closest("td")
        .then(($secondBodyCell) => {
          const secondRect = $secondBodyCell[0].getBoundingClientRect();
          expect(Math.abs(firstRect.width - secondRect.width), `${columnId} row-to-row width consistency`).to.be.lte(1);
          expect(Math.abs(firstRect.left - secondRect.left), `${columnId} row-to-row left edge consistency`).to.be.lte(1);
          expect(Math.abs(firstRect.right - secondRect.right), `${columnId} row-to-row right edge consistency`).to.be.lte(1);
        });
    });
}

function Harness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([
    { id: "1", title: "Build UI", status: "todo", amount: 10 },
    { id: "2", title: "Ship", status: "done", amount: 20 }
  ]);

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      },
      deleteRows: async (rowIds) => {
        setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
      },
      restoreRows: async (deletedRows) => {
        setRows((current) => [...deletedRows, ...current]);
      },
      createRow: async (draft) => {
        const row: TaskRow = {
          id: crypto.randomUUID(),
          title: String(draft.title ?? ""),
          status: String(draft.status ?? "todo"),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [row, ...current]);
        return row;
      }
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ editing: true, rowDelete: true, rowAdd: true, clipboardPaste: true }}
      />
    </div>
  );
}

function VirtualizationHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () =>
      Array.from({ length: 160 }, (_, index) => ({
        id: String(index + 1),
        title: `Task ${index + 1} with wrapped content ${index % 7 === 0 ? "that should measure row height more often" : ""}`,
        status: index % 3 === 0 ? "todo" : "done",
        amount: 100 + index
      })),
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
      />
    </div>
  );
}

function AlignmentHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      { id: "1", title: "Build UI", status: "todo", amount: 10 },
      { id: "2", title: "Ship", status: "done", amount: 20 }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[1200px] p-4">
      <DataTable
        tableId={tableId}
        columns={alignmentColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function LinkOverflowHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      {
        id: "1",
        title: "Build UI",
        status: "todo",
        amount: 10,
        website: "https://example.com/supercalifragilisticexpialidocioussupercalifragilisticexpialidocious"
      }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[420px] p-4">
      <DataTable
        tableId={tableId}
        columns={linkOverflowColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

describe("DataTable component", () => {
  it("edits a text cell", () => {
    cy.mount(<Harness tableId="cypress-table-edit" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").clear();
    cy.findByLabelText("Edit Title").type("Build table");
    cy.findByLabelText("Edit Title").blur();
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.contains("Build table").should("exist");
  });

  it("toggles column visibility", () => {
    cy.mount(<Harness tableId="cypress-table-visibility" />);

    cy.contains("Hidden columns").should("not.exist");

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Hide").click();
    cy.findByRole("columnheader", { name: /Amount/i }).should("not.exist");
    cy.contains("Hidden columns (1)").should("exist");

    cy.contains("Hidden columns (1)").click();
    cy.get("[data-hidden-column-row='amount']").contains("button", "Show").click();
    cy.findByRole("columnheader", { name: /Amount/i }).should("exist");
  });

  it("sorts through the column dialog and exposes status in header attrs", () => {
    cy.mount(<Harness tableId="cypress-table-sort" />);

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Sort desc").click();

    cy.get("th[data-column-id='amount']").should("have.attr", "data-column-sort-status", "desc");
  });

  it("applies select filters through the column dialog", () => {
    cy.mount(<Harness tableId="cypress-table-filter" />);

    cy.get("[data-column-menu-trigger='status']").first().click({ force: true });
    cy.get("[role='dialog'][aria-label='Status options']")
      .find("select")
      .last()
      .select("To do", { force: true });

    cy.contains("Build UI").should("exist");
    cy.contains("Ship").should("exist");
    cy.get("th[data-column-id='status']").should("have.attr", "data-column-filter-active", "true");
  });

  it("reorders columns via drag and drop in the same pin zone", () => {
    cy.mount(<Harness tableId="cypress-table-reorder" />);

    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();

      cy.get("[data-column-reorder-handle='title']").trigger("dragstart", { dataTransfer, force: true });
      cy.get("th[data-column-id='amount']").then(($target) => {
        const rect = $target[0].getBoundingClientRect();
        cy.wrap($target).trigger("dragover", { dataTransfer, clientX: rect.right - 2 });
        cy.wrap($target).trigger("drop", { dataTransfer, clientX: rect.right - 2 });
      });
      cy.get("[data-column-reorder-handle='title']").trigger("dragend", { dataTransfer, force: true });
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["status", "amount", "title"]);
      });
  });

  it("ignores drag reorder across pin zones", () => {
    cy.mount(<Harness tableId="cypress-table-reorder-zones" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();

      cy.get("[data-column-reorder-handle='title']").trigger("dragstart", { dataTransfer, force: true });
      cy.get("th[data-column-id='amount']").then(($target) => {
        const rect = $target[0].getBoundingClientRect();
        cy.wrap($target).trigger("dragover", { dataTransfer, clientX: rect.left + 2 });
        cy.wrap($target).trigger("drop", { dataTransfer, clientX: rect.left + 2 });
      });
      cy.get("[data-column-reorder-handle='title']").trigger("dragend", { dataTransfer, force: true });
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["title", "status", "amount"]);
      });
  });

  it("renders pinned columns with a darker header and body surface", () => {
    cy.mount(<AlignmentHarness tableId="cypress-table-pinned-surface" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });

    cy.get("th[data-column-id='title']")
      .should("have.attr", "data-pinned-state", "left")
      .then(($pinnedHeader) => {
        const pinnedHeaderStyle = getComputedStyle($pinnedHeader[0]);

        cy.get("th[data-column-id='status']")
          .should("have.attr", "data-pinned-state", "center")
          .then(($centerHeader) => {
            const centerHeaderStyle = getComputedStyle($centerHeader[0]);
            expect(pinnedHeaderStyle.backgroundImage).to.not.equal(centerHeaderStyle.backgroundImage);
          });
      });

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`)
      .first()
      .closest("td")
      .should("have.attr", "data-pinned-state", "left")
      .then(($pinnedCell) => {
        const pinnedCellStyle = getComputedStyle($pinnedCell[0]);

        cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='status']`)
          .first()
          .closest("td")
          .should("have.attr", "data-pinned-state", "center")
          .then(($centerCell) => {
            const centerCellStyle = getComputedStyle($centerCell[0]);
            expect(pinnedCellStyle.backgroundColor).to.not.equal(centerCellStyle.backgroundColor);
          });
      });
  });

  it("resizes a column from the resize handle without changing header order", () => {
    cy.mount(<Harness tableId="cypress-table-resize-no-reorder" />);

    let beforeWidth = 0;
    let resizeStartX = 0;

    cy.get("th[data-column-id='status']").then(($header) => {
      beforeWidth = $header[0].getBoundingClientRect().width;
      const rect = $header[0].getBoundingClientRect();
      resizeStartX = Math.round(rect.right - 1);

      cy.get("[data-column-resize-handle='status']").trigger("mousedown", {
        button: 0,
        clientX: resizeStartX,
        force: true
      });
    });

    cy.document().trigger("mousemove", { clientX: resizeStartX + 80 });
    cy.document().trigger("mouseup");

    cy.get("th[data-column-id='status']").then(($header) => {
      const afterWidth = $header[0].getBoundingClientRect().width;
      expect(afterWidth).to.be.greaterThan(beforeWidth);
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["title", "status", "amount"]);
      });
  });

  it("keeps header and body column edges aligned in fill mode and after resize", () => {
    cy.mount(<AlignmentHarness tableId="cypress-table-alignment" />);

    assertHeaderBodyColumnAlignment("title", "1");
    assertHeaderBodyColumnAlignment("status", "1");
    assertHeaderBodyColumnAlignment("amount", "1");
    assertBodyColumnWidthConsistency("title", "1", "2");
    assertBodyColumnWidthConsistency("status", "1", "2");
    assertBodyColumnWidthConsistency("amount", "1", "2");

    let resizeStartX = 0;

    cy.get("th[data-column-id='status']").then(($header) => {
      const rect = $header[0].getBoundingClientRect();
      resizeStartX = Math.round(rect.right - 1);
      cy.get("[data-column-resize-handle='status']").trigger("mousedown", {
        button: 0,
        clientX: resizeStartX,
        force: true
      });
    });

    cy.document().trigger("mousemove", { clientX: resizeStartX + 120 });
    cy.document().trigger("mouseup");

    assertHeaderBodyColumnAlignment("title", "1");
    assertHeaderBodyColumnAlignment("status", "1");
    assertHeaderBodyColumnAlignment("amount", "1");
    assertBodyColumnWidthConsistency("title", "1", "2");
    assertBodyColumnWidthConsistency("status", "1", "2");
    assertBodyColumnWidthConsistency("amount", "1", "2");
  });

  it("clips long link content inside the cell boundary", () => {
    cy.mount(<LinkOverflowHarness tableId="cypress-table-link-overflow" />);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='website']`)
      .first()
      .then(($cell) => {
        const cell = $cell[0];
        const cellRect = cell.getBoundingClientRect();
        const style = getComputedStyle(cell);

        expect(style.overflowX, "website cell overflow should be clipped").to.equal("hidden");
        expect(cell.scrollWidth, "website cell should still contain overflowing content").to.be.greaterThan(cell.clientWidth);

        cy.wrap($cell)
          .closest("td")
          .then(($bodyCell) => {
            const bodyRect = $bodyCell[0].getBoundingClientRect();
            expect(Math.abs(cellRect.right - bodyRect.right), "website cell should stay within its column width").to.be.lte(1);
          });
      });
  });

  it("adds a row from the draft row and deletes selected rows", () => {
    cy.mount(<Harness tableId="cypress-table-row-mutations" />);

    cy.contains("Add row").click();
    cy.findByPlaceholderText("Add Title").type("New task");
    cy.findByPlaceholderText("Add Status").type("todo{enter}");

    cy.contains("New task").should("exist");

    cy.findByLabelText("Select row 1").check({ force: true });
    cy.contains("Delete selected").click();
    cy.contains("Build UI").should("not.exist");
  });

  it("supports keyboard editing trigger", () => {
    cy.mount(<Harness tableId="cypress-table-keyboard" />);

    cy.findByRole("grid").focus().trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Status").select("done");
    cy.contains("Done").should("exist");
  });

  it("keeps arrow keys inside the active editor bound to the editor", () => {
    cy.mount(<Harness tableId="cypress-table-editor-arrow-ownership" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{rightarrow}{esc}");
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.findByRole("grid").should("have.focus").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Title").should("exist");
  });

  it("restores grid focus after escape so keyboard navigation resumes immediately", () => {
    cy.mount(<Harness tableId="cypress-table-post-escape-navigation" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{esc}");
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.findByRole("grid").should("have.focus");
    cy.findByRole("grid").trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Status").should("exist");
  });

  it("does not continuously emit virtualizer measurement warnings while idle", () => {
    const warningMessage = "Missing attribute name 'data-index={index}' on measured element.";
    let warningCount = 0;
    let restoreConsole: (() => void) | null = null;
    let firstSampleCount = 0;

    cy.window().then((win) => {
      const originalWarn = win.console.warn.bind(win.console);
      const originalError = win.console.error.bind(win.console);

      win.console.warn = (...args) => {
        if (args.some((arg) => typeof arg === "string" && arg.includes(warningMessage))) {
          warningCount += 1;
          return;
        }
        originalWarn(...args);
      };

      win.console.error = (...args) => {
        if (args.some((arg) => typeof arg === "string" && arg.includes(warningMessage))) {
          warningCount += 1;
          return;
        }
        originalError(...args);
      };

      restoreConsole = () => {
        win.console.warn = originalWarn;
        win.console.error = originalError;
      };
    });

    cy.mount(<VirtualizationHarness tableId="virtualization-regression-table-idle" />);
    cy.findByRole("grid").scrollTo("bottom");
    cy.findByRole("grid").scrollTo("top");
    cy.wait(300);

    cy.then(() => {
      firstSampleCount = warningCount;
    });

    cy.wait(500);

    cy.then(() => {
      expect(
        warningCount,
        "virtualizer warning count should stabilize instead of increasing in a render loop"
      ).to.equal(firstSampleCount);

      restoreConsole?.();
    });
  });

  it("keeps header backgrounds opaque while scrolling", () => {
    cy.mount(<VirtualizationHarness tableId="virtualization-regression-table-header" />);

    cy.findByRole("grid").scrollTo(0, 420);

    cy.get("thead").then(($thead) => {
      const style = getComputedStyle($thead[0]);
      expect(
        style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)",
        "thead should render a painted background"
      ).to.equal(true);
    });

    cy.get("thead tr")
      .eq(0)
      .find("th")
      .first()
      .then(($headerCell) => {
        const style = getComputedStyle($headerCell[0]);
        expect(
          style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)",
          "header cell should render a painted background"
        ).to.equal(true);
      });
  });
});
