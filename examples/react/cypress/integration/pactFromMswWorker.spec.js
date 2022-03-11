
// / <reference types="cypress" />

import { setupPactMswAdapter } from '../../../../src/pactMswAdapter';

let pactMswAdapter = undefined;

beforeEach(async () => {
    if (!pactMswAdapter) {
        cy.window().then(window => {
            pactMswAdapter = setupPactMswAdapter({
                worker: window.msw.worker,
                options: {
                    consumer: 'web-ea',
                    timeout: 1000,
                    providers: {
                        'edge-api-admin': [ 'edge-api-admin' ]
                    },
                    pactOutDir: './pacts',
                    excludeUrl: ['static/'],
                    // debug: true
                },
              });
            pactMswAdapter.newTest();
        });
    } else {
        pactMswAdapter.newTest();
    }
});
afterEach(async () => {
    if (!pactMswAdapter) return;
    
    try {
        await pactMswAdapter.verifyTest();
    } catch (err) {
        // cypress doesn't like errors on hooks...
        if (process.env.NODE_ENV !== 'production') {
            console.groupCollapsed('%cError generating pacts.', 'color:coral;font-weight:bold;');
            console.log(err);
            console.groupEnd();
        } else {
            // fail on pipelines
            throw err;
        }
    }
});
after(async () => {
    if (!pactMswAdapter) return;
    console.log('saf')
    await pactMswAdapter.writeToFile((path, data) => cy.writeFile(path, data));
    pactMswAdapter.clear();
});

describe('Tests setupPactMswAdapter with msw works', () => {
    
    it('should record a msw interaction and turn it into a back', () => {
        
        cy.visit("http://localhost:3000");
        // cy.wait("@products");
  
        // Filter to the product we want
        cy.get("#input-product-search").type("28 degrees");
    });
});