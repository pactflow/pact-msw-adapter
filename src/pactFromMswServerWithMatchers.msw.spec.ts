import API from "../examples/react/src/api";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { PactFile, setupPactMswAdapter } from "./pactMswAdapter";
import { MatchersV3 } from "@pact-foundation/pact";

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "testConsumerWithMatchers",
    providers: {
      ["testProvider"]: ["products"],
      ["testProvider2"]: ["/product/10"],
    },
    debug: true,
    includeUrl: ["products", "/product"],
    excludeUrl: ["/product/11"],
    excludeHeaders: ["x-powered-by", "cookie", "accept-encoding", "host"],
    useFuzzyMatchers: true,
  },
});

describe("API - With MSW mock generating matchers", () => {
  let pactResults: PactFile[] = [];

  beforeAll(async () => {
    server.listen();
  });

  beforeEach(async () => {
    pactMswAdapter.newTest();
    pactResults = [];
  });

  afterEach(async () => {
    pactMswAdapter.verifyTest();
    server.resetHandlers();
    pactMswAdapter.clear();
  });

  afterAll(async () => {
    server.close();
  });

  describe("'like' matcher", () => {
    test("generates a contract with the matcher at the top level", async () => {
      const product = {
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      };
      server.use(
        http.get(API.url + "/product/10", () => {
          return HttpResponse.json(product);
        })
      );

      const respProduct = await API.getProduct("10");
      expect(respProduct).toEqual({
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      });

      await pactMswAdapter.writeToFile((path, data) => {
        pactResults.push(data as PactFile);
      });

      expect(pactResults[0].interactions[0].response.body).toEqual({
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      });
      expect(pactResults[0].interactions[0].response.matchingRules).toEqual({
        body: {
          "$.id": {
            match: "type",
          },
          "$.type": {
            match: "type",
          },
          "$.name": {
            match: "type",
          },
        },
      });
    });

    test("generates a contract with the matcher nested", async () => {
      const product = {
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
        category: {
          type: "Food",
        },
      };

      server.use(
        http.get(API.url + "/product/10", () => {
          return HttpResponse.json(product);
        })
      );

      const respProduct = await API.getProduct("10");
      expect(respProduct).toEqual({
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
        category: {
          type: "Food",
        },
      });

      await pactMswAdapter.writeToFile((path, data) => {
        pactResults.push(data as PactFile);
      });

      expect(pactResults[0].interactions[0].response.body).toEqual({
        id: "10",
        type: "CREDIT_CARD",
        name: "Gem Visa",
        category: {
          type: "Food",
        },
      });
      expect(pactResults[0].interactions[0].response.matchingRules).toEqual({
        body: {
          "$.id": {
            match: "type",
          },
          "$.type": {
            match: "type",
          },
          "$.name": {
            match: "type",
          },
          "$.category.type": {
            match: "type",
          },
        },
      });
    });
  });
});
