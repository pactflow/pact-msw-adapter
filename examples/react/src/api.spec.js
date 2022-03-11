import API from "./api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setupPactMswAdapter } from "../../../src/pactMswAdapter";

const server = setupServer();
const pactMswAdapter = setupPactMswAdapter({
  server,
  options: {
    consumer: "testConsumer", providers: { ['testProvider']: ['products'], ['testProvider2']: ['/product/10'] },
    debug: true,
    includeUrl: ['products', '/product'],
    excludeUrl: ['/product/11'],
    excludeHeaders: ["x-powered-by", "cookie"]
  },
});

describe("API", () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    pactMswAdapter.newTest();
  });

  afterEach(() => {
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

  test("get product ID 50", async () => {
    const product = {
      id: "50",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    server.use(
      rest.get(API.url + "/product/50", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(product));
      })
    );
    const respProduct = await API.getProduct("50");
    expect(respProduct).toEqual(product);
  });
});
