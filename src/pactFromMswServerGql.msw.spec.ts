import { GetBooksQuery } from '../examples/react/src/graphqlClient';
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
      await pactMswAdapter.writeToFile(); // writes the pacts to a file
      pactMswAdapter.clear();
      server.close();
    });

  it.only("should get all books", async () => {
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
          const response = res(ctx.data(books));
          console.log('printing request');
          console.log(req);
          console.log('printing response');
          console.log(response)
          return response;
        })
      );
      console.log('printing handlers');
      server.printHandlers();

      const respBooks = await GetBooksQuery();
      console.log(respBooks);
      expect(respBooks).toEqual(books);
  });
  it("should write a pactfile", async () => {
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
    console.log(respBooks);
    let pactResults: PactFile[] = [];
    await pactMswAdapter.writeToFile((path, data) => {
      pactResults.push(data as PactFile);
      console.log(data);
    }); // writes the pacts to a file
    expect(pactResults.length).toEqual(2);

    expect(pactResults.length).toEqual(2);
    expect(pactResults[0].consumer.name).toEqual("testConsumer");
    expect(pactResults[0].provider.name).toEqual("testProvider");
    expect(pactResults[1].consumer.name).toEqual("testConsumer");
    expect(pactResults[1].provider.name).toEqual("testProvider2");
    expect(pactResults[0].interactions[0].request.method).toEqual("GET");
    expect(pactResults[0].interactions[0].request.path).toEqual("/products");
    expect(pactResults[0].interactions[0].request.headers).toEqual({
      accept: "application/json, text/plain, */*",
      authorization: expect.any(String),
      "user-agent": expect.any(String),
    });
    expect(pactResults[0].interactions[0].response.status).toEqual(200);

    expect(pactResults[0].interactions[0].response.headers).toEqual({
      "content-type": "application/json",
    });
    expect(pactResults[0].interactions[0].response.body).toEqual([
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ]);
    expect(pactResults[1].interactions[0].request.body).toEqual({
      type: "CREDIT_CARD",
      name: "28 Degrees",
    });
    expect(pactResults[1].interactions[1].request.body).toBeUndefined();
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