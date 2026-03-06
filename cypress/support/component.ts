import "../../apps/demo/src/index.css";
import "@testing-library/cypress/add-commands";
import { mount } from "cypress/react";

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", mount);
