import { GetBooksQuery } from '../examples/react/src/graphqlClient';
import { graphql } from "msw";
import { setupServer } from "msw/node";
import { setupPactMswAdapter } from "./pactMswAdapter";

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

  it("should get all books", async () => {
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
        graphql.query('GetBooks', (req, res, ctx) => {
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
});