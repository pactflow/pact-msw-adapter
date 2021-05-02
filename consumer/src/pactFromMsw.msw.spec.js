import API from "./api";
import { rest, response, context } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  rest.get("*", (req, res, ctx) => {
    console.log(`No pact interaction defined for ${req.url}`);
    return res(
      ctx.status(200),
      ctx.body(JSON.stringify({ error: "No pact interaction defined" }))
    );
  })
);
describe("API - With MSW mock generating a pact", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
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
        return res(ctx.status(200), ctx.body(JSON.stringify(products)));
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
        return res(ctx.status(200), ctx.body(JSON.stringify(product)));
      })
    );

    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });
});
