/// <reference types="cypress" />

import type { PactMswAdapter } from "@pactflow/pact-msw-adapter";
import { setupPactMswAdapter } from "@pactflow/pact-msw-adapter";
import type { SetupWorker } from "msw/browser";

type MswWindow = Cypress.AUTWindow & { msw: { worker: SetupWorker } };

let pactMswAdapter: PactMswAdapter | undefined;

describe("Tests setupPactMswAdapter with msw works", () => {
	beforeEach(() => {
		cy.visit("http://localhost:3000");
		// Wait for MSW to finish its async initialisation (worker.start() is
		// awaited in index.tsx before React renders, but the Vite dev-server
		// serves modules over HTTP so window.msw may not be set yet when
		// cy.visit() resolves). Cypress retries the assertion automatically.
		cy.window().should("have.nested.property", "msw.worker");
		if (pactMswAdapter) {
			pactMswAdapter.newTest();
		} else {
			cy.window().then((win) => {
				const w = win as MswWindow;
				pactMswAdapter = setupPactMswAdapter({
					worker: w.msw.worker,
					options: {
						consumer: "testConsumer",
						timeout: 1000,
						providers: {
							testProvider: ["/products"],
							testProvider2: ["/product/09"],
						},
						// pactOutDir: './pacts',
						// excludeUrl: ['static/'],
						includeUrl: ["/products", "/product/09"],
						excludeHeaders: ["ignore-me"],
						// debug: true
					},
				});
				pactMswAdapter.newTest();
			});
		}
	});

	afterEach(() => {
		if (!pactMswAdapter) {
			return;
		}
		pactMswAdapter.verifyTest();
	});

	after(async () => {
		if (!pactMswAdapter) {
			return;
		}
		await pactMswAdapter.writeToFile((path, data) => {
			cy.writeFile(path, data);
		});
		pactMswAdapter.clear();
	});

	it("should record a msw interaction and turn it into a pact", () => {
		// Filter to the product we want
		cy.get("[data-testid='product-search']").type("Gem Visa");
		cy.get(".btn").click();
		cy.url().should("include", "/products/09");
		cy.contains("Gem Visa");
	});
});
