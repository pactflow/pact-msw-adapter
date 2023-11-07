import { GetBooksQuery } from './fixtures/graphqlClient';
import { graphql } from "msw";
import { setupServer } from "msw/node";
import { setupPactMswAdapter, PactFile } from "./pactMswAdapter";
import { fetch } from 'cross-fetch';

// Add `fetch` polyfill.
global.fetch = fetch;

const pjson = require("../package.json");

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "testConsumer",
    providers: {
      ["graphql"]: ["graphql"],
    },
    debug: false,
  },
});

describe("API - With MSW mock generating a pact", () => {
    beforeAll(async () => {
      server.listen({ onUnhandledRequest: 'error' });
    });
  
    beforeEach(async () => {
      pactMswAdapter.newTest();
    });
  
    afterEach(async () => {
      pactMswAdapter.verifyTest();
      server.resetHandlers();
    });
  
    afterAll(async () => {
      // await pactMswAdapter.writeToFile(); // writes the pacts to a file
      pactMswAdapter.clear();
      server.close();
    });

  it("should fail on a mismatch", async () => {
    const books = 
      { books: [
          {
            title: 'Blood Meridian',
            author: 'Cormac McCarthy',
            __typename: 'Book',
          },
          {
            title: 'The Golden Compass',
            author: 'Philip Pullman',
            __typename: 'Book',
          },
        ]};
    server.use(
      graphql.query('NotAQuery', (req, res, ctx) => {
        return res(ctx.data(books));
      })
    );

    try {
      const respBooks = await GetBooksQuery();
      expect(respBooks).toEqual(books);
    }
    catch (e){
      console.warn("expecting test to fail", e)


    }
    pactMswAdapter.verifyTest()
    let pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((path, data) => {
      pactResults.push(data as PactFile);
      console.log(data);
    }); // not pacts to write
    expect(pactResults.length).toEqual(0);

});
  it("should write a pactfile only if there is a match", async () => {
    const books = 
      { books: [
          {
            title: 'Blood Meridian',
            author: 'Cormac McCarthy',
            __typename: 'Book',
          },
          {
            title: 'The Golden Compass',
            author: 'Philip Pullman',
            __typename: 'Book',
          },
        ]};
    server.use(
      graphql.query('GetBooksQuery', (req, res, ctx) => {
        return res(ctx.data(books));
      })
    );

    const respBooks = await GetBooksQuery();
    expect(respBooks).toEqual(books);

    // pactMswAdapter.verifyTest()
    let pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((path, data) => {
      pactResults.push(data as PactFile);
      console.log(data);
    }); // writes the pacts to a file
    expect(pactResults.length).toEqual(1);
    expect(pactResults[0].consumer.name).toEqual("testConsumer");
    expect(pactResults[0].provider.name).toEqual("graphql");
    expect(pactResults[0].interactions[0].request.method).toEqual("POST");
    expect(pactResults[0].interactions[0].request.path).toEqual("/graphql");
    expect(pactResults[0].interactions[0].response.status).toEqual(200);

    expect(pactResults[0].interactions[0].response.headers).toEqual({
      "content-type": "application/json",
      "x-powered-by": "msw",
    });
    console.log(pactResults[0].interactions[0].response.body);
    expect(pactResults[0].interactions[0].response.body).toEqual({ "data": books });
    expect(pactResults[0].metadata).toEqual({
      pactSpecification: {
        version: "2.0.0",
      },
      client: {
        name: "pact-msw-adapter",
        version: pjson.version,
      },
    });
});
});