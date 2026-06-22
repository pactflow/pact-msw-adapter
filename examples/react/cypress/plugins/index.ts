/// <reference types="cypress" />
import cypressLogToOutput from "cypress-log-to-output";

export default (
  on: Cypress.PluginEvents,
  _config: Cypress.PluginConfigOptions,
): void => {
  cypressLogToOutput.install(on);
};
