// / <reference types="cypress" />

import { setupPactMswAdapter } from '@pactflow/pact-msw-adapter';

let pactMswAdapter = undefined;

describe('Tests setupPactMswAdapter with msw works', async () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    if (!pactMswAdapter) {
      cy.window().then((window) => {
        pactMswAdapter = setupPactMswAdapter({
          worker: window.msw.worker,
          options: {
            consumer: 'testConsumer',
            timeout: 1000,
            providers: {
              ['testProvider']: ['/products'],
              ['testProvider2']: ['/product/09']
            },
            // pactOutDir: './pacts',
            // excludeUrl: ['static/'],
            includeUrl: ['/products', '/product/09'],
            excludeHeaders: ['ignore-me']
            // debug: true
          }
        });
        pactMswAdapter.newTest();
      });
    } else {
      pactMswAdapter.newTest();
    }
  });

  afterEach(() => {
    if (!pactMswAdapter) return;
    try {
      pactMswAdapter.verifyTest();
    } catch (err) {
      // cypress doesn't like errors on hooks...
      if (process.env.NODE_ENV !== 'production') {
        console.groupCollapsed(
          '%cError generating pacts.',
          'color:coral;font-weight:bold;'
        );
        console.log(err);
        console.groupEnd();
      } else {
        // fail on pipelines
        console.log(err);
        throw err;
      }
    }
  });

  after(async () => {
    if (!pactMswAdapter) return;

    try {
      await pactMswAdapter.writeToFile((path, data) => {
        console.log(JSON.stringify(data));
        cy.writeFile(path, data);
      });
    } catch (err) {
      console.groupCollapsed(
        '%cError generating pacts.',
        'color:coral;font-weight:bold;'
      );
      console.log(err);
      console.groupEnd();
      throw err;
    }
    pactMswAdapter.clear();
  });

  it('should record a msw interaction and turn it into a pact', () => {
    // Filter to the product we want
    cy.get('#input-product-search').type('Gem Visa');
    cy.get('.btn').click();
    cy.url().should('include', '/products/09');
    cy.contains('Gem Visa');
  });
});
