/// <reference types="@testing-library/cypress" />

describe("demo app", () => {
  it("loads and performs key interactions", () => {
    cy.visit("/");

    cy.contains("Convex DataTable").should("exist");
    cy.contains("In-memory example").should("exist");
    cy.contains("Project 1").should("exist");

    cy.get("[data-column-menu-trigger='status']").click();
    cy.contains("button", "Hide").click();
    cy.findByRole("columnheader", { name: /Status/i }).should("not.exist");
    cy.contains("Hidden columns (1)").click();
    cy.get("[data-hidden-column-row='status']").contains("button", "Show").click();
    cy.findByRole("columnheader", { name: /Status/i }).should("exist");
    cy.contains("th", "Actions").should("not.exist");
    cy.findByLabelText("Open actions for row 1").click();
    cy.findByRole("menu", { name: "Actions for row 1" }).within(() => {
      cy.findByRole("menuitem", { name: "Open" }).should("exist");
    });
    cy.get("body").click(0, 0);
    cy.findByRole("menu", { name: "Actions for row 1" }).should("not.exist");

    cy.get("th[data-column-id='name']")
      .first()
      .then(($headerCell) => {
        const headerRect = $headerCell[0].getBoundingClientRect();

        cy.get("tr[data-row-id='1'] [role='gridcell'][data-column-id='name']")
          .first()
          .closest("td")
          .then(($bodyCell) => {
            const bodyRect = $bodyCell[0].getBoundingClientRect();
            expect(Math.abs(headerRect.left - bodyRect.left), "name left edge alignment").to.be.lte(1);
            expect(Math.abs(headerRect.right - bodyRect.right), "name right edge alignment").to.be.lte(1);
            expect(Math.abs(headerRect.width - bodyRect.width), "name width alignment").to.be.lte(1);
          });
      });

    cy.contains("Project 1").dblclick();
    cy.findByLabelText("Edit Project").type("{selectall}{backspace}Project 1 Updated");
    cy.get("body").click(0, 0);
    cy.findByLabelText("Edit Project").should("not.exist");
  });

  it("switches to the Convex page", () => {
    cy.visit("/");

    cy.contains("a", "Convex").click();

    cy.contains(/Convex adapter example|Set VITE_CONVEX_URL/).should("exist");
  });
});
