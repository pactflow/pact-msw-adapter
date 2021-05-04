import API from "../examples/react/src/api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setupMswPact } from "./mswPact";

const server = setupServer();
const mswPactProvider = setupMswPact({
  server,
  options: { writePact: true },
});


describe("API - With MSW mock generating a pact", () => {
  server.listen();
  beforeAll(async () => {
  });
  beforeEach(async () => {
    mswPactProvider.listen()
  });
  afterEach( () => {
    server.resetHandlers();
    console.log( mswPactProvider.returnPact());
  });
  afterAll(async () => {
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
    await expect(API.getProduct("10")).rejects.toThrow(
      "connect ECONNREFUSED 127.0.0.1:8081"
    );
  });
});
