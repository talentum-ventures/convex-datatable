/// <reference types="@testing-library/cypress" />

describe("demo app", () => {
  it("loads and performs key interactions", () => {
    cy.visit("/");

    cy.contains("Rolha Grid").should("exist");
    cy.contains("Project 1").should("exist");

    cy.get("[data-column-menu-trigger='website']").click();
    cy.contains("button", "Hide").click();
    cy.findByRole("columnheader", { name: /Website/i }).should("not.exist");
    cy.contains("Hidden columns (1)").click();
    cy.get("[data-hidden-column-row='website']").contains("button", "Show").click();
    cy.findByRole("columnheader", { name: /Website/i }).should("exist");

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
    cy.findByLabelText("Edit Project").clear();
    cy.findByLabelText("Edit Project").type("Project 1 Updated");
    cy.get("body").click(0, 0);
    cy.findByLabelText("Edit Project").should("not.exist");
  });
});
