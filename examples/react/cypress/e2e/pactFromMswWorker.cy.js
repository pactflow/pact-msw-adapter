// / <reference types="cypress" />

import process from "node:process";
import { setupPactMswAdapter } from "@pactflow/pact-msw-adapter";

let pactMswAdapter;

describe("Tests setupPactMswAdapter with msw works", async () => {
	beforeEach(() => {
		cy.visit("http://localhost:3000");
		if (pactMswAdapter) {
			pactMswAdapter.newTest();
		} else {
			cy.window().then((window) => {
				pactMswAdapter = setupPactMswAdapter({
					worker: window.msw.worker,
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
		try {
			pactMswAdapter.verifyTest();
		} catch (err) {
			// cypress doesn't like errors on hooks...
			if (process.env.NODE_ENV !== "production") {
			} else {
				throw err;
			}
		}
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
		cy.get("#input-product-search").type("Gem Visa");
		cy.get(".btn").click();
		cy.url().should("include", "/products/09");
		cy.contains("Gem Visa");
	});
});
