/// <reference types="cypress" />
import type { SetupWorker } from "msw/browser";
import { convertMswMatchToPact } from "../../../../src/convertMswMatchToPact.ts";
import { getPactTemplateRegistry, type MatchedRequest, setupPactMswAdapter } from "../../../../src/pactMswAdapter.ts";

type W = Cypress.AUTWindow & { msw: { worker: SetupWorker }; probeFetch: () => Promise<unknown> };

it("probe", () => {
  cy.visit("http://localhost:3017/probe.html");
  cy.window().should("have.nested.property", "msw.worker");
  cy.window().then(async (win) => {
    const w = win as W;
    const adapter = setupPactMswAdapter({
      worker: w.msw.worker,
      options: { consumer: "c", providers: { p: ["probe-api"] }, includeUrl: ["probe-api"], templateRegistry: getPactTemplateRegistry(w) },
    });
    const matches: MatchedRequest[] = [];
    const matched = new Promise<void>((r) =>
      adapter.emitter.on("pact-msw-adapter:match", (m: MatchedRequest) => { matches.push(m); r(); }),
    );
    adapter.newTest();
    const body = await w.probeFetch();
    await matched;
    const pact = await convertMswMatchToPact({ consumer: "c", provider: "p", matches });
    return { body, response: pact.interactions[0].response };
  }).then((p) => cy.writeFile("probe-result.json", p));
});
