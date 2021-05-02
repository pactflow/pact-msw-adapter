import API from "./api";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { j2s } from "./utils";
import { convertMswMatchToPact } from "./convertMswMatchToPact";

const server = setupServer();

describe("API - With MSW mock generating a pact", () => {
  beforeAll(() => {
    server.listen();
    const requestMatch = new Promise((resolve) => {
      server.on("request:match", resolve);
    });
    const responseMocked = new Promise((resolve) => {
      server.on("response:mocked", resolve);
    });

    Promise.all([requestMatch, responseMocked]).then((data) => {
      console.log("Request matched and response mocked");
      const request = data[0]; // MockedRequest<DefaultRequestBody>
      const response = data[1]; // IsomorphicResponse;
      console.log(j2s(request));
      console.log(j2s(response));
      console.log(j2s(convertMswMatchToPact(request, response)));
    });
    server.on("request:unhandled", (unhandled) => {
      const { url } = unhandled;
      console.log("This request was unhandled by msw: " + url);
    });
  });
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
        return res(ctx.status(200), ctx.body(j2s(products)));
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
        return res(ctx.status(200), ctx.body(j2s(product)));
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
