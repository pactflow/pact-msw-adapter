import API from "../examples/react/src/api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { PactFile, setupMswPactAdapter } from "./pactMswAdapter";

const server = setupServer();
const pactMswAdapter = setupMswPactAdapter({
  server,
  options: {
    consumer: "testConsumer", providers: { ['testProvider']: ['products'],['testProvider2']: ['/product/10'] },
    debug: true,
    includeUrl: ['products', '/product'],
    excludeUrl: ['/product/11'],
    excludeHeaders: ["x-powered-by","cookie"]
  },
});

describe("API - With MSW mock generating a pact", () => {
  beforeAll(async () => {
    server.listen();
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

  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    server.use(
      rest.get(API.url + "/products", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(products));
      })
    );

    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(products);
  });

  test("get product ID 10", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    server.use(
      rest.get(API.url + "/product/10", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(product));
      })
    );

    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });

  test("unhandled route", async () => {
    await expect(API.getProduct("11")).rejects.toThrow(
      "connect ECONNREFUSED 127.0.0.1:8081"
    );
  });

  test("creates pact files", async () => {
    let pactResults: PactFile[] = []
    await pactMswAdapter.writeToFile((path, data) => { pactResults.push(data as PactFile) }); // writes the pacts to a file
    expect(pactResults.length).toEqual(2)
    expect(pactResults[0].consumer.name).toEqual('testConsumer')
    expect(pactResults[0].provider.name).toEqual('testProvider')
    expect(pactResults[1].consumer.name).toEqual('testConsumer')
    expect(pactResults[1].provider.name).toEqual('testProvider2')
    expect(pactResults[0].interactions[0].request.method).toEqual('GET')
    expect(pactResults[0].interactions[0].request.path).toEqual('/products')
    expect(pactResults[0].interactions[0].request.headers).toEqual({
      "accept": "application/json, text/plain, */*",
      "authorization": expect.any(String) ,
      "user-agent": expect.any(String),
      "host": "localhost:8081",
    })
    expect(pactResults[0].interactions[0].response.status).toEqual(200)

    expect(pactResults[0].interactions[0].response.headers).toEqual({
      "content-type": "application/json"
    })
    expect(pactResults[0].interactions[0].response.body).toEqual([
      {
        "id": "09",
        "type": "CREDIT_CARD",
        "name": "Gem Visa"
      }
    ])
    expect(pactResults[0].metadata).toEqual({
      "pactSpecification": {
        "version": "2.0.0"
      }
    })

  })
});
